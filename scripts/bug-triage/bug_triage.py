#!/usr/bin/env python3
"""Alkemio open-bug triage page: incremental GitHub sync + deterministic HTML build.

Subcommands
  sync  [--full] [--repos a,b]   fetch issues/timelines/releases into the state dir
  build [--out PATH]             render the page from the state dir
  status                         show what the state dir holds

Repositories, exclusions and the page URL come from config.json next to this file.
State dir: --state, else $ALKEMIO_BUG_TRIAGE_STATE, else ~/.local/state/alkemio-bug-triage.
In CI the state lives on the gh-pages branch under gh-pages-root/bug-triage/state so
every run is incremental (see .github/workflows/bug-triage-refresh.yml).
Requires: gh (GH_TOKEN or an authenticated login), python3 >= 3.8. No third-party packages.
"""
import argparse, collections, concurrent.futures as cf, datetime as dt, html, json, os, re, statistics, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.load(open(HERE / 'config.json'))
ORG = CONFIG['org']
TODAY = dt.date.today()
STATE = ISSUES = META = TIMELINES = RELEASES = STORIES = PRS = None  # set by set_state()

def set_state(path):
    global STATE, ISSUES, META, TIMELINES, RELEASES, STORIES, PRS
    STATE = Path(path or os.environ.get('ALKEMIO_BUG_TRIAGE_STATE', Path.home() / '.local/state/alkemio-bug-triage'))
    ISSUES, META, TIMELINES = STATE / 'issues.ndjson', STATE / 'meta.json', STATE / 'timelines.json'
    RELEASES, STORIES, PRS = STATE / 'releases.tsv', STATE / 'release-stories.json', STATE / 'open-prs.ndjson'

# ----------------------------------------------------------------------------- helpers
def log(*a): print(*a, file=sys.stderr, flush=True)

def gh(path, jq, paginate=True, per_page=100, max_pages=200):
    """Fetch every page of `path` (which must carry per_page=) by explicit page numbers.

    The installed gh (2.4) mis-handles GitHub's cursor Link headers under --paginate and
    silently stops early, so pagination is driven here: stop at the first short page.
    """
    out = []
    for page in range(1, (max_pages if paginate else 1) + 1):
        url = f"{path}&page={page}" if '?' in path else f"{path}?page={page}"
        p = subprocess.run(['gh', 'api', url, '--jq', f'{{n: length, items: [{jq_inner(jq)}]}}'], capture_output=True, text=True)
        if p.returncode:
            if 'HTTP 404' not in p.stderr and 'Not Found' not in p.stderr:
                log(f'  ! gh {url}: {p.stderr.strip()[:200]}')
            break
        try: d = json.loads(p.stdout)
        except json.JSONDecodeError:
            log(f'  ! gh {url}: unparsable page'); break
        out += d['items']
        if d['n'] < per_page: break
    return out

def jq_inner(jq):
    # callers write '.[] | <projection> | @json'; run the projection per element and keep objects
    return jq.replace(' | @json', '')

def active_repos():
    return list(CONFIG['repos'])

def load_issues():
    if not ISSUES.exists(): return {}
    out = {}
    for l in open(ISSUES):
        if l.strip():
            d = json.loads(l); out[f"{d['repo']}/{d['n']}"] = d
    return out

def save_issues(store):
    with open(ISSUES, 'w') as f:
        for k in sorted(store): f.write(json.dumps(store[k], ensure_ascii=False) + '\n')

ISSUE_JQ = ('.[] | select(.pull_request==null) | {repo:"%s", n:.number, t:.title, state:.state, reason:.state_reason, '
            'c:.created_at, x:.closed_at, u:.updated_at, labels:[.labels[].name], asg:(.assignees|length>0), '
            'b:(.body//""), type:(.type.name//null), url:.html_url} | @json')

# ----------------------------------------------------------------------------- sync
def sync(args):
    STATE.mkdir(parents=True, exist_ok=True)
    meta = json.load(open(META)) if META.exists() else {'last_sync': {}}
    repos = args.repos.split(',') if args.repos else active_repos()
    store = {} if args.full else load_issues()
    started = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    for r in repos:
        since = None if args.full else meta['last_sync'].get(r)
        if since:
            got = gh(f'repos/{ORG}/{r}/issues?state=all&since={since}&per_page=100', ISSUE_JQ % r)
            log(f'{r}: {len(got)} updated since {since}')
        else:
            got = gh(f'repos/{ORG}/{r}/issues?state=open&per_page=100', ISSUE_JQ % r)
            got += gh(f'repos/{ORG}/{r}/issues?state=closed&labels=bug&per_page=100', ISSUE_JQ % r)
            log(f'{r}: full fetch, {len(got)} issues')
        for d in got: store[f"{r}/{d['n']}"] = d
        meta['last_sync'][r] = (started - dt.timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M:%SZ')
    save_issues(store)
    # timelines for open bugs that changed since their cached fetch
    tls = json.load(open(TIMELINES)) if TIMELINES.exists() and not args.full else {}
    rows = [d for d in store.values() if d['state'] == 'open' and included(d)]
    todo = [d for d in rows if d['u'] > tls.get(f"{d['repo']}/{d['n']}", {}).get('fetched', '')]
    log(f'timelines: {len(rows)} open bugs, {len(todo)} to (re)fetch')
    jq = ('.[] | select(.event=="cross-referenced" or .event=="added_to_project_v2" or .event=="removed_from_project_v2" '
          'or .event=="project_v2_item_status_changed" or .event=="parent_issue_added" or .event=="parent_issue_removed") '
          '| {e:.event, at:(.created_at//""), src:(if .source then {repo:(.source.issue.repository.full_name//""), '
          'n:.source.issue.number, t:(.source.issue.title//""), state:(.source.issue.state//""), '
          'pr:(.source.issue.pull_request!=null), merged:(.source.issue.pull_request.merged_at//null)} else null end)} | @json')
    def fetch(d):
        return f"{d['repo']}/{d['n']}", gh(f"repos/{ORG}/{d['repo']}/issues/{d['n']}/timeline?per_page=100", jq)
    with cf.ThreadPoolExecutor(6) as ex:
        for k, ev in ex.map(fetch, todo):
            tls[k] = {'fetched': started.strftime('%Y-%m-%dT%H:%M:%SZ'), 'events': ev}
    json.dump(tls, open(TIMELINES, 'w'))
    # releases, stories, open PRs: small, always full
    with open(RELEASES, 'w') as f:
        for r in repos:
            for row in gh(f'repos/{ORG}/{r}/releases?per_page=100',
                          '.[] | [.tag_name, (.published_at//.created_at)[:10], (.prerelease|tostring)] | @json'):
                f.write('\t'.join([r] + row) + '\n')
    stories = gh(f'repos/{ORG}/alkemio/issues?state=all&labels=release&per_page=100',
                 '.[] | select(.pull_request==null) | {n:.number, t:.title, state:.state, c:.created_at[:10], x:(.closed_at//"")[:10], b:(.body//""), url:.html_url} | @json')
    json.dump(stories, open(STORIES, 'w'))
    with open(PRS, 'w') as f:
        for r in repos:
            for p in gh(f'repos/{ORG}/{r}/pulls?state=open&per_page=100',
                        '.[] | {repo:"%s", n:.number, t:.title, draft:.draft, b:(.body//""), url:.html_url, branch:.head.ref, c:.created_at[:10]} | @json' % r):
                f.write(json.dumps(p) + '\n')
    meta['synced_at'] = started.strftime('%Y-%m-%dT%H:%M:%SZ')
    json.dump(meta, open(META, 'w'), indent=1)
    log(f'synced {len(store)} issues, {len(tls)} timelines, {len(stories)} release stories')

# ----------------------------------------------------------------------------- classification
BASELINE = json.load(open(HERE / 'baseline.json'))['issues']
FAIL = re.compile(r"^\s*\[?bug\]?\b|crash|cannot|can't|can not|unable|\bfail(?:s|ed|ing|ure)?\b(?!-)|not working|doesn't work|does not work|broken|\bleak|exception|throws|regression|outage|\bis not (?:shown|displayed|sent|working|possible)|\bare not\b", re.I)
EXCLUDE_TITLE = re.compile(r"^\s*(epic|spike|refactor|chore|placeholder for|release \d)", re.I)
WAD = re.compile(r"working as (?:designed|intended)|not a bug\b|this is expected behaviou?r", re.I)

def included(d):
    if f"{d['repo']}/{d['n']}" in BASELINE: return True   # reviewed rows stay until closed
    labels = set(d['labels'])
    if 'Epic' in labels or 'release' in labels or d.get('type') in ('Epic', 'Task', 'Feature request'): return False
    if WAD.search(d.get('b', '')[:4000]): return False
    if 'bug' in labels or d.get('type') == 'Bug': return True
    if 'user story' in labels or d.get('type'): return False
    return bool(FAIL.search(d['t'])) and not EXCLUDE_TITLE.search(d['t'])

HI_LAB = {'User High Priority', 'Rhea Priority', 'security'}
HI = re.compile(r"crash|data loss|lose data|loses data|\blost\b|login|log in|sign ?in|security|leak|cannot|can't|can not|unable|fails?\b|failing|broken|not (?:working|possible)|doesn't work|error page|\b5\d\d\b|outage|exposed?|escalat|unauthori", re.I)
LO = re.compile(r"typo|wording|spelling|alignment|misalign|spacing|padding|margin|colou?r|cosmetic|font|tooltip|caption|capitali|truncat|overlap", re.I)

def severity(d):
    if set(d['labels']) & HI_LAB or HI.search(d['t']): return 'High'
    if LO.search(d['t']): return 'Low'
    return 'Medium'

AREA_RULES = [
 ("Whiteboards", r"whiteboard|excalidraw|canvas|drawing"),
 ("Virtual Contributors / AI", r"\bvc\b|virtual contributor|\bai\b|assistant|chatbot|guidance|engine|ingest|openai|llm|mcp"),
 ("Notifications", r"notification|\bemail\b|e-mail|digest|mail\b|newsletter"),
 ("Chat, comments & messaging", r"\bchat|comment|messag|matrix|synapse|conversation|mention|\bdm\b|reply|replies|discussion"),
 ("Licensing & plans", r"licen[cs]|plan\b|plans\b|entitlement|subscription|credit|wingback|payment|billing|feature flag"),
 ("Innovation flow & templates", r"innovation flow|template|\bphase|\bstate\b|\bstages?\b|library|pack|innovation hub"),
 ("Callouts, posts & contributions", r"callout|\bpost\b|\bposts\b|contribution|link collection|reference|framing|memo"),
 ("Auth, identity & permissions", r"\bauth|login|log in|logout|sign ?in|sign ?up|register|registration|kratos|oidc|session|password|permission|privilege|credential|unauthori|forbidden|access|\brole\b|verif|invite|invitation|token|api key|2fa|mfa"),
 ("Community, roles & membership", r"community|member|membership|lead\b|leads\b|admin\b|join|application|applicant|guest|contributor"),
 ("Spaces & subspaces", r"space|subspace|challenge|opportunity|journey|hub\b|dashboard|tutorial|welcome|onboard|about page|settings"),
 ("Users & profiles", r"\buser|profile|avatar|account|preferences|my dashboard|my spaces|delete me|deletion"),
 ("Organisations", r"organi[sz]ation"),
 ("Files, storage & documents", r"\bfile|upload|storage|document|attachment|image|photo|pdf|bucket|visual|banner|icon\b|download|collaborative doc"),
 ("Calendar & events", r"calendar|\bevent\b|\bevents\b"),
 ("Search & navigation", r"search|navigat|breadcrumb|redirect|\burl\b|link\b|route|routing|404|menu|sidebar|tab\b|tabs\b|back button|scroll"),
 ("Performance & stability", r"performance|slow|timeout|memory|leak|crash|\b5\d\d\b|hang|freeze|latency|load time|cpu|restart|outage|down\b"),
 ("API, GraphQL & MCP", r"graphql|\bapi\b|query|mutation|resolver|schema|endpoint|rest\b|dataloader|subscription|websocket"),
 ("Infra, CI & deployment", r"deploy|kubernetes|k8s|helm|docker|pipeline|\bci\b|github action|workflow|traefik|ingress|cert|dns|cluster|migration|backup|redis|rabbit|postgres|mysql|database|\bdb\b|env\b|config|secret|nginx|prometheus|grafana|elastic|kibana|logging|logs?\b"),
 ("Test suites & QA", r"\btest|spec\b|e2e|playwright|coverage|flaky|jest|vitest|cypress|smoke"),
 ("Markdown / rich text editor", r"markdown|rich text|editor|tiptap|wysiwyg|formatting|bold|italic|emoji"),
 ("UI, layout & mobile", r"mobile|responsive|layout|overlap|alignment|\bcss\b|style|padding|margin|font|colour|color|button|tooltip|dialog|modal|popup|overflow|truncat|width|height|render|display|hover|dark mode|scrollbar|spacing|ui\b|ux\b|design"),
 ("Localisation & content", r"translat|i18n|locale|language|dutch|german|typo|wording|text\b|copy\b|label\b"),
 ("Analytics", r"analytics|metabase|report|statistic|kpi|usage"),
 ("Documentation", r"docs?\b|documentation|readme|guide"),
]
AREA_COMP = [(a, re.compile(p, re.I)) for a, p in AREA_RULES]
REPO_AREA = {'notifications': 'Notifications', 'infrastructure-operations': 'Infra, CI & deployment',
             'infrastructure-provisioning': 'Infra, CI & deployment', 'test-suites': 'Test suites & QA',
             'documentation': 'Documentation', 'whiteboard-collaboration-service': 'Whiteboards',
             'virtual-contributor': 'Virtual Contributors / AI', 'ecosystem-analytics': 'Analytics'}

def area(title, repo):
    for a, rx in AREA_COMP:
        if rx.search(title): return a
    return REPO_AREA.get(repo, 'Other / unclassified')

def classify(d):
    k = f"{d['repo']}/{d['n']}"
    b = BASELINE.get(k)
    return (b['a'] if b else area(d['t'], d['repo'])), (b['s'] if b else severity(d))

# ----------------------------------------------------------------------------- build
def age_bucket(days):
    return '≤30d' if days <= 30 else '31–90d' if days <= 90 else '91–365d' if days <= 365 else '1–2y' if days <= 730 else '>2y'

def build(args):
    store = load_issues()
    if not store: sys.exit('state dir is empty — run `sync --full` first')
    meta = json.load(open(META)); snapshot = meta['synced_at'][:10]
    snapshot_t = meta['synced_at'].replace('T', ' ')[:16] + ' UTC'
    tls = json.load(open(TIMELINES)) if TIMELINES.exists() else {}
    board_ok = any(e['e'] == 'added_to_project_v2' for v in tls.values() for e in v.get('events', []))
    prs = [json.loads(l) for l in open(PRS)] if PRS.exists() else []
    stories = json.load(open(STORIES)) if STORIES.exists() else []
    tags = [l.rstrip('\n').split('\t') for l in open(RELEASES)] if RELEASES.exists() else []
    E = html.escape
    # ---- open rows
    rows = []
    for d in store.values():
        if d['state'] != 'open' or not included(d): continue
        a, s = classify(d)
        days = (TODAY - dt.date.fromisoformat(d['c'][:10])).days
        r = {'repo': d['repo'], 'n': d['n'], 't': d['t'], 'u': d['url'], 'a': a, 's': s, 'd': days, 'ab': age_bucket(days),
             'p': 'production' in d['labels'], 'l': 'bug' in d['labels'], 'c': d['c'][:10], 'asg': d['asg'], 'b': d['b']}
        ev = tls.get(f"{d['repo']}/{d['n']}", {}).get('events', [])
        r['bd'] = sum(e['e'] == 'added_to_project_v2' for e in ev) > sum(e['e'] == 'removed_from_project_v2' for e in ev)
        r['ep'] = sum(e['e'] == 'parent_issue_added' for e in ev) > sum(e['e'] == 'parent_issue_removed' for e in ev)
        r['po'], r['pm'], r['rl'] = [], [], []
        for e in ev:
            src = e.get('src')
            if e['e'] != 'cross-referenced' or not src: continue
            repo = src['repo'].split('/')[-1]
            if src['pr']:
                item = {'repo': repo, 'n': src['n'], 't': src['t'], 'u': f'https://github.com/{ORG}/{repo}/pull/{src["n"]}'}
                if src['state'] == 'open': r['po'].append(dict(item, d=False))
                elif src['merged']: r['pm'].append(dict(item, at=e['at'][:10]))
            elif repo == 'alkemio' and re.match(r'(Release|Patch)\b', src['t']):
                r['rl'].append({'n': src['n'], 't': src['t'], 'u': f'https://github.com/{ORG}/alkemio/issues/{src["n"]}'})
        rows.append(r)
    keys = {(r['repo'], r['n']): r for r in rows}
    for p in prs:  # open PRs that name the bug in title/body/branch
        text = p['t'] + '\n' + p['b'] + '\n' + p['branch']
        refs = {(rp, int(n)) for rp, n in re.findall(r'github\.com/' + ORG + r'/([\w-]+)/issues/(\d+)', text)}
        refs |= {(p['repo'], int(n)) for n in re.findall(r'(?<![\w/#-])#(\d{3,5})\b', text)}
        refs |= {(p['repo'], int(n)) for n in re.findall(r'(?:^|[-/])(\d{4,5})(?:-|$)', p['branch'])}
        for k in refs:
            r = keys.get(k)
            if r and not any(x['n'] == p['n'] and x['repo'] == p['repo'] for x in r['po']):
                r['po'].append({'repo': p['repo'], 'n': p['n'], 't': p['t'], 'u': p['url'], 'd': p['draft']})
    for r in rows:
        r['pl'] = 'pr_open' if r['po'] else 'pr_merged' if r['pm'] else 'release' if r['rl'] else 'board' if (r['bd'] or r['ep']) else 'none'
    L = ({'board_tile': f'<div><b>{sum(r["bd"] for r in rows)}</b><span>on the delivery board</span></div>',
          'board_opt': 'On the board, no fix yet', 'none_opt': 'No signal anywhere', 'none_tile': 'no signal anywhere',
          'board_note': 'whether it sits on the board, whether a fix PR is open or already merged, and whether a release story cross-references it.'}
         if board_ok else
         {'board_tile': '<div><b>–</b><span>board membership: not readable by this token</span></div>',
          'board_opt': 'Sub-issue of an epic, no fix yet', 'none_opt': 'No PR, epic or release signal', 'none_tile': 'no PR, epic or release signal',
          'board_note': 'whether a fix PR is open or already merged, whether it is a sub-issue of an epic, and whether a release story cross-references it. Board membership is <em>not</em> shown: the token used for this refresh cannot read project events, so "no signal" here may still be on the board.'})
    SEV = ['High', 'Medium', 'Low']
    rows.sort(key=lambda r: (SEV.index(r['s']), r['a'], -r['d']))
    cnt = collections.Counter(r['pl'] for r in rows)
    onboard = sum(r['bd'] for r in rows)
    # ---- matrices
    areas = sorted({r['a'] for r in rows}, key=lambda a: -sum(1 for r in rows if r['a'] == a))
    repos_ = sorted({r['repo'] for r in rows}, key=lambda x: -sum(1 for r in rows if r['repo'] == x))
    def cell(n, cls='num'): return f'<td class="{cls}">{n if n else "·"}</td>'
    def mrow(label, sub, attr):
        return (f'<tr><td><button class="link" data-filter-{attr}="{E(label)}">{E(label)}</button></td>'
                + cell(sum(r['s']=='High' for r in sub), 'num sev-h') + cell(sum(r['s']=='Medium' for r in sub)) + cell(sum(r['s']=='Low' for r in sub))
                + f'<td class="num total">{len(sub)}</td>')
    area_rows = ''.join(mrow(a, [r for r in rows if r['a']==a], 'area') + cell(sum(r['d']<=90 for r in rows if r['a']==a)) + cell(sum(r['d']>365 for r in rows if r['a']==a)) + '</tr>' for a in areas)
    area_rows += (f'<tr class="sum"><td>All areas</td>' + cell(sum(r['s']=='High' for r in rows), 'num sev-h') + cell(sum(r['s']=='Medium' for r in rows)) + cell(sum(r['s']=='Low' for r in rows))
                  + f'<td class="num total">{len(rows)}</td>' + cell(sum(r['d']<=90 for r in rows)) + cell(sum(r['d']>365 for r in rows)) + '</tr>')
    AB = ['≤30d', '31–90d', '91–365d', '1–2y', '>2y']
    age_rows = ''.join(f'<tr><td>{s}</td>' + ''.join(cell(sum(1 for r in rows if r['s']==s and r['ab']==b)) for b in AB) + '</tr>' for s in SEV)
    repo_rows = ''.join(mrow(x, [r for r in rows if r['repo']==x], 'repo') + cell(sum(r['p'] for r in rows if r['repo']==x)) + '</tr>' for x in repos_)
    matrix = f'''<section class="grid2">
 <div><h2>Severity by area</h2><div class="scroll"><table class="matrix"><thead><tr><th>Area</th><th class="num">High</th><th class="num">Medium</th><th class="num">Low</th><th class="num">Total</th><th class="num">≤90d</th><th class="num">&gt;1y</th></tr></thead><tbody>{area_rows}</tbody></table></div><p class="note">Click an area to filter the list below. "≤90d" and "&gt;1y" count issues by days since opened.</p></div>
 <div class="stack">
  <div><h2>Severity by age</h2><div class="scroll"><table class="matrix small"><thead><tr><th>Severity</th>{''.join(f'<th class="num">{E(b)}</th>' for b in AB)}</tr></thead><tbody>{age_rows}</tbody></table></div></div>
  <div><h2>Severity by repository</h2><div class="scroll"><table class="matrix small"><thead><tr><th>Repository</th><th class="num">High</th><th class="num">Medium</th><th class="num">Low</th><th class="num">Total</th><th class="num">Prod-labelled</th></tr></thead><tbody>{repo_rows}</tbody></table></div></div>
 </div>
</section>'''
    # ---- trend
    closed = [d for d in store.values() if d['state'] == 'closed' and 'bug' in d['labels'] and d.get('x')]
    allb = [{'a': r['a'], 'c': r['c'], 'x': None} for r in rows] + [{'a': area(d['t'], d['repo']), 'c': d['c'][:10], 'x': d['x'][:10]} for d in closed]
    ym = lambda s: s[:7]
    months = sorted({ym(b['c']) for b in allb} | {ym(b['x']) for b in allb if b['x']})
    opened = collections.Counter(ym(b['c']) for b in allb); closedm = collections.Counter(ym(b['x']) for b in allb if b['x'])
    backlog, run = [], 0
    for m in months: run += opened[m] - closedm[m]; backlog.append(run)
    last = months[-24:]
    q = lambda s: s[:4] + 'Q' + str((int(s[5:7]) - 1) // 3 + 1)
    quarters = sorted({q(b['c']) for b in allb})[-8:]
    aq = collections.Counter((b['a'], q(b['c'])) for b in allb)
    top = sorted({b['a'] for b in allb}, key=lambda a: -sum(aq[(a, qq)] for qq in quarters))
    lat = collections.defaultdict(list)
    for d in closed: lat[d['x'][:4]].append((dt.date.fromisoformat(d['x'][:10]) - dt.date.fromisoformat(d['c'][:10])).days)
    latency = {y: {'n': len(v), 'median': statistics.median(v), 'p90': sorted(v)[int(len(v) * .9)]} for y, v in sorted(lat.items())}
    trend = {'months': last, 'opened': [opened[m] for m in last], 'closed': [closedm[m] for m in last], 'backlog': backlog[-24:],
             'quarters': quarters, 'areas': top, 'area_q': {a: [aq[(a, qq)] for qq in quarters] for a in top}, 'latency': latency}
    # classifier agreement on the reviewed baseline, for the caveat
    reviewed = [r for r in rows if f"{r['repo']}/{r['n']}" in BASELINE]
    agree = round(100 * sum(area(r['t'], r['repo']) == r['a'] for r in reviewed) / max(len(reviewed), 1))
    lattab = ''.join(f"<tr><td>{y}</td><td class='num'>{v['n']}</td><td class='num'>{v['median']:g}</td><td class='num'>{v['p90']}</td></tr>" for y, v in latency.items())
    time_sec = f'''<section>
 <h2>Over time</h2>
 <div class="charts">
  <div class="viz wide"><h3>Bugs opened and closed per month</h3><p class="sub">All repositories, last 24 months, by issue open date and close date.</p><div id="c-flow"></div><div class="legend"><span><i style="background:var(--s1)"></i>Opened</span><span><i style="background:var(--s2)"></i>Closed</span></div></div>
  <div class="viz"><h3>Open backlog at month end</h3><p class="sub">Cumulative opened minus closed; ends at today's {len(rows)}.</p><div id="c-backlog"></div></div>
  <div class="viz"><h3>Time to close</h3><p class="sub">Days from open to close, by year closed.</p><div class="scroll"><table class="matrix trendtab"><thead><tr><th>Year</th><th class="num">Closed</th><th class="num">Median</th><th class="num">p90</th></tr></thead><tbody>{lattab}</tbody></table></div></div>
  <div class="viz wide"><h3>Bugs raised per quarter, by area</h3><p class="sub">Eight largest areas over the last eight quarters; the rest fold into Other. Hover a segment for the count.</p><div id="c-area"></div><div class="legend" id="l-area"></div></div>
 </div>
 <p class="note">Closed bugs are assigned an area by the same title-keyword rule as new open bugs; on the reviewed open list that rule agrees {agree}% of the time, so read the area split as a shape rather than a count.</p>
</section>'''
    excl_html = ', '.join(f'<span class="mono">{E(x["repo"])}</span>' for x in CONFIG.get('excluded', [])) + '.'
    # ---- releases
    def latest_tag(repo, upto):
        c = [(d_, t) for r_, t, d_, pre in tags if r_ == repo and pre == 'false' and d_ <= upto and re.match(r'^v?\d+\.\d+\.\d+$', t)]
        c.sort(key=lambda x: (x[0], [int(p) for p in x[1].lstrip('v').split('.')]))
        return c[-1][1] if c else None
    rel = []
    for s_ in stories:
        if not re.match(r'(Release \d+(\.\d+)?|Patch)\b', s_['t']): continue
        m = re.search(r'Release date\*?\*?\s*:?\s*\*?\*?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})', s_['b'])
        d_ = None
        if m:
            d_ = m.group(1)
            if '.' in d_: dd, mm, yy = d_.split('.'); d_ = f'{yy}-{int(mm):02d}-{int(dd):02d}'
        shipped = d_ or s_['x'] or None
        rel.append({'n': s_['n'], 't': s_['t'], 'state': s_['state'], 'shipped': shipped, 'url': s_['url'],
                    'vers': {r_: latest_tag(r_, shipped) for r_ in ('server', 'client-web', 'notifications')} if shipped else {}})
    rel.sort(key=lambda x: (x['shipped'] or '9999', x['n']))
    for i, w in enumerate(rel):
        lo, hi = (rel[i - 1]['shipped'] if i else None), w['shipped']
        w['closed_w'] = sum(1 for d in closed if lo and hi and lo < d['x'][:10] <= hi) if lo and hi else None
        w['opened_w'] = sum(1 for b in allb if lo and hi and lo < b['c'] <= hi) if lo and hi else None
    shipped_rel = [w for w in rel if w['shipped']][-13:]
    open_rel = [w for w in rel if w['state'] == 'open']
    v = lambda x: E(x) if x else '·'
    reltab = ''.join(f'''<tr class="{w['state']}"><td class="n"><a href="{w['url']}" target="_blank" rel="noopener">{E(w['t'])}</a>{' <span class="badge unl">story open</span>' if w['state']=='open' else ''}</td><td class="v">{w['shipped']}</td><td class="v">{v(w['vers'].get('server'))}</td><td class="v">{v(w['vers'].get('client-web'))}</td><td class="v">{v(w['vers'].get('notifications'))}</td><td class="num">{w['opened_w'] if w['opened_w'] is not None else '·'}</td><td class="num">{w['closed_w'] if w['closed_w'] is not None else '·'}</td></tr>''' for w in reversed(shipped_rel))
    releases = f'''<section>
 <h2>Releases</h2>
 <div class="grid2">
  <div><div class="scroll"><table class="matrix rel"><thead><tr><th>Release</th><th>Shipped</th><th>server</th><th>client</th><th>notif.</th><th class="num">Raised</th><th class="num">Closed</th></tr></thead><tbody>{reltab}</tbody></table></div>
  <p class="note">Shipped = the story's release date (or its close date). Versions are the newest non-prerelease tag published on or before that date. "Raised" and "Closed" count bug issues opened or closed between the previous row's date and this one, across all repositories — a cadence proxy, not the story's declared scope.</p></div>
  <div class="stack">
   <div class="callout"><b>Why there is no "planned for Release NN" column.</b> The delivery board keeps release targeting in its iteration field, and the GitHub token in use lacks the <span class="mono">read:project</span> scope, so that field cannot be read. Repository milestones are not used for releases. What <em>is</em> shown per bug is everything the issue itself records: {L['board_note']}</div>
   <div class="callout" style="border-left-color:var(--ink3)"><b>Repositories not on this page.</b> {excl_html} These are private repositories; this page is published on a public site, so their issue titles and bodies would become public. Their bugs are tracked on the delivery board only.</div>
   <div><h3 style="font-size:15px;margin:14px 0 6px">Release stories still open</h3><p class="oa">{', '.join(f'<a href="{w["url"]}" target="_blank" rel="noopener">{E(w["t"])}</a>' for w in open_rel) or 'none'}</p></div>
   <div><h3 style="font-size:15px;margin:14px 0 6px">Fix merged, issue still open</h3><p class="oa">{cnt['pr_merged']} open bugs have a merged pull request cross-referencing them. Some are partial fixes, some were simply never closed. Use the Planning filter below to review them; each row links the PR.</p></div>
  </div>
 </div>
</section>'''
    # ---- header, kpis, list, footer
    header = f'''<header>
 <div><div class="eyebrow">alkem-io · open issues · synced {snapshot_t}</div><h1>Alkemio Open Bug Triage</h1>
 <p>Every open bug across the repositories that have any, grouped by severity and functional area, with age, planning status, the release cadence they sit against, and how the intake has moved over the last two years. Severity is derived from priority labels and failure wording, not from a field the tracker holds, so treat it as a starting proposal.</p></div>
 <div class="totals"><div class="h"><b>{sum(r['s']=='High' for r in rows)}</b>High</div><div class="m"><b>{sum(r['s']=='Medium' for r in rows)}</b>Medium</div><div class="l"><b>{sum(r['s']=='Low' for r in rows)}</b>Low</div><div><b>{len(rows)}</b>Total</div></div>
</header>'''
    kpis = f'''<div class="kpis">
 {L['board_tile']}
 <div class="go"><b>{cnt['pr_open']}</b><span>fix PR open</span></div>
 <div class="warn"><b>{cnt['pr_merged']}</b><span>fix merged, issue still open</span></div>
 <div><b>{cnt['release']}</b><span>named in a release story</span></div>
 <div class="bad"><b>{cnt['none']}</b><span>{L['none_tile']}</span></div>
</div>'''
    opt = lambda vals: ''.join(f'<option value="{E(x)}">{E(x)}</option>' for x in vals)
    listsec = f'''<section>
 <h2>All open bugs</h2>
 <div class="filters">
  <label>Severity<select id="f-sev"><option value="">All</option>{opt(SEV)}</select></label>
  <label>Area<select id="f-area"><option value="">All</option>{opt(areas)}</select></label>
  <label>Repository<select id="f-repo"><option value="">All</option>{opt(repos_)}</select></label>
  <label>Age<select id="f-age"><option value="">All</option>{opt(AB)}</select></label>
  <label>Flag<select id="f-flag"><option value="">All</option><option value="prod">Production-labelled</option><option value="unl">No bug label</option><option value="unassigned">Unassigned</option></select></label>
  <label>Planning<select id="f-plan"><option value="">All</option><option value="pr_open">Fix PR open</option><option value="pr_merged">Fix merged, issue still open</option><option value="release">Named in a release story</option><option value="board">{L['board_opt']}</option><option value="none">{L['none_opt']}</option></select></label>
  <label>Search<input id="f-q" type="search" placeholder="title or number"></label>
  <button class="reset" id="f-reset" type="button">Clear</button>
  <span class="count" id="count"></span>
 </div>
 <div id="list"></div>
</section>'''
    footer = f'''<footer>Sources: GitHub issues API, synced {snapshot_t} — every open issue in the active alkem-io repositories, every closed issue labelled <span class="mono">bug</span>, each open bug's timeline (board membership, cross-references), open pull requests, release tags, and the <span class="mono">release</span>-labelled stories in alkem-io/alkemio. Included: issues labelled <span class="mono">bug</span> or typed Bug ({sum(r['l'] for r in rows)}) plus {sum(not r['l'] for r in rows)} unlabelled issues whose title states a failure. Excluded: epics, tasks, feature requests, release stories, and issues whose own body says "working as designed". Severity rule: High = a priority or security label, or a crash, data loss, login, security, or hard "cannot/fails" failure in the title; Low = cosmetic wording in the title; everything else Medium. Area is keyword-matched on the title. Reviewed rows keep the area and severity recorded in baseline.json; everything else follows the rules. Not scanned: {excl_html} — private repositories, see the note under Releases. Refreshed {E(CONFIG.get('schedule',''))} by <span class="mono">scripts/bug-triage/bug_triage.py</span> in alkem-io/test-suites; run it locally for an ad-hoc refresh.</footer>'''
    tpl = open(HERE / 'template.html').read()
    page = (tpl.replace('{{HEADER}}', header).replace('{{KPIS}}', kpis).replace('{{MATRIX}}', matrix).replace('{{RELEASES}}', releases)
            .replace('{{TIME}}', time_sec).replace('{{LIST}}', listsec).replace('{{FOOTER}}', footer)
            .replace('{{ROWS}}', json.dumps(rows, ensure_ascii=False).replace('</script>', '<\\/script>')).replace('{{TREND}}', json.dumps(trend)).replace('{{BOARD_OK}}', 'true' if board_ok else 'false'))
    out = Path(args.out) if args.out else STATE / 'page.html'
    out.write_text(page)
    print(json.dumps({'out': str(out), 'snapshot': snapshot, 'open': len(rows), 'high': sum(r['s']=='High' for r in rows),
                      'medium': sum(r['s']=='Medium' for r in rows), 'low': sum(r['s']=='Low' for r in rows), 'closed_history': len(closed),
                      'planning': dict(cnt), 'on_board': onboard if board_ok else None, 'board_readable': board_ok, 'kb': len(page) // 1024}, indent=1))

def status(args):
    if not META.exists(): print('no state yet:', STATE); return
    meta = json.load(open(META)); store = load_issues()
    print('state dir:', STATE); print('synced_at:', meta.get('synced_at'))
    print('issues:', len(store), 'open:', sum(d['state']=='open' for d in store.values()),
          'open bugs:', sum(d['state']=='open' and included(d) for d in store.values()))
    for r, t in sorted(meta['last_sync'].items()): print(f'  {r:40s} {t}')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('sync'); s.add_argument('--full', action='store_true'); s.add_argument('--repos'); s.set_defaults(fn=sync)
    b = sub.add_parser('build'); b.add_argument('--out'); b.set_defaults(fn=build)
    st = sub.add_parser('status'); st.set_defaults(fn=status)
    for sp in (s, b, st): sp.add_argument('--state', help='state directory (default: $ALKEMIO_BUG_TRIAGE_STATE or ~/.local/state/alkemio-bug-triage)')
    a = ap.parse_args(); set_state(a.state); a.fn(a)
