"""Trace every schema root field to the lib operations, server-api spec files and client-web spec files that reach it.
Run from the test-suites repo root:  python3 -I trace-usage.py root-fields.tsv usage.json
root-fields.tsv = <kind>\t<name>\t<type>\t<description> per root field (see extract-root-fields.py)."""
import re, os, sys, json, glob, collections
roots = [l.rstrip('\n').split('\t') for l in open(sys.argv[1]) if l.strip()]
root_names = {r[1] for r in roots}
word = re.compile(r'\b(' + '|'.join(sorted(root_names, key=len, reverse=True)) + r')\b')
files = {}
for pat in ('lib/src/**/*.ts', 'lib/src/**/*.graphql', 'server-api/src/**/*.ts', 'client-web/src/**/*.ts', 'client-web/src/**/*.graphql'):
    for f in glob.glob(pat, recursive=True):
        if '/generated/' in f or f.endswith('.d.ts'): continue
        files[f] = open(f, errors='ignore').read()
own = {f: set(word.findall(s)) for f, s in files.items()}
op_file = {}
for f, s in files.items():
    if f.endswith('.graphql'):
        for m in re.finditer(r'^\s*(?:mutation|query|subscription)\s+(\w+)', s, re.M): op_file[m.group(1)] = f
for f, s in files.items():
    if f.endswith('.ts'):
        for m in re.finditer(r'\b(?:graphqlClient|sdk|client)\.(\w+)\s*\(', s):
            if m.group(1) in op_file: own[f] |= own[op_file[m.group(1)]]
        for m in re.finditer(r'readFileSync\(resolve\(libGraphqlPath,\s*[\'"]([^\'"]+)', s):
            p = 'lib/src/scenario/graphql/' + m.group(1)
            if p in own: own[f] |= own[p]
exports = collections.defaultdict(list)
for f, s in files.items():
    for m in re.finditer(r'^export\s+(?:const|async function|function|class)\s+(\w+)', s, re.M): exports[m.group(1)].append(f)
ALIAS = {'@functional-api': 'server-api/src/functional-api', '@src': 'server-api/src', '@utils': 'server-api/src/utils', '@common': 'server-api/src/common', '@generated': 'server-api/src/core/generated', '@alkemio/tests-lib': 'lib/src'}
def resolve_mod(f, mod):
    if mod.startswith('.'): base = os.path.normpath(os.path.join(os.path.dirname(f), mod))
    else:
        base = None
        for a, p in ALIAS.items():
            if mod == a or mod.startswith(a + '/'): base = p + mod[len(a):]; break
        if base is None: return None
    base = re.sub(r'\.js$', '', base)
    for c in (base + '.ts', base + '/index.ts', base):
        if c in files: return c
    return None
BARREL = {'lib/src/index.ts'}
imports = {}
for f, s in files.items():
    if not f.endswith('.ts'): continue
    lst = []
    for m in re.finditer(r'import\s*(type\s*)?(\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*\{[^}]*\})?\s*from\s*[\'"]([^\'"]+)[\'"]', s, re.S):
        if m.group(1): continue
        tgt = resolve_mod(f, m.group(3)); names = re.findall(r'(\w+)(?:\s+as\s+\w+)?\s*[,}]', (m.group(2) or '') + '}') if (m.group(2) or '').startswith('{') else []
        lst.append((tgt, names))
    imports[f] = lst
reach = {f: set(v) for f, v in own.items()}
strict = {f: set(v) for f, v in own.items()}   # never propagates through the lib: what the spec or its own helpers name
for _ in range(5):
    for f, lst in imports.items():
        for tgt, names in lst:
            if tgt and tgt not in BARREL:
                reach[f] |= reach.get(tgt, set())
                if not tgt.startswith('lib/'): strict[f] |= strict.get(tgt, set())
            else:
                for n in names:
                    for ef in exports.get(n, []):
                        if ef.startswith('lib/'): reach[f] |= reach.get(ef, set())
use = {r[1]: {'kind': r[0], 'type': r[2], 'desc': r[3], 'lib': False, 'lib_fns': set(), 'server_api_files': [], 'client_web_files': [], 'server_api_files_strict': [], 'client_web_files_strict': []} for r in roots}
for f, fs in reach.items():
    for x in fs:
        if f.startswith('lib/'):
            use[x]['lib'] = True
            if x in own[f]:
                for n, efs in exports.items():
                    if f in efs: use[x]['lib_fns'].add(n)
        elif f.startswith('server-api/src/functional-api/') and f.endswith('.it-spec.ts'): use[x]['server_api_files'].append(f)
        elif f.startswith('client-web/src/') and f.endswith('.spec.ts'): use[x]['client_web_files'].append(f)
for f, fs in strict.items():
    for x in fs:
        if f.startswith('server-api/src/functional-api/') and f.endswith('.it-spec.ts'): use[x]['server_api_files_strict'].append(f)
        elif f.startswith('client-web/src/') and f.endswith('.spec.ts'): use[x]['client_web_files_strict'].append(f)
for v in use.values():
    v['lib_fns'] = sorted(v['lib_fns'])[:12]
    for k in ('server_api_files', 'client_web_files', 'server_api_files_strict', 'client_web_files_strict'): v[k].sort()
    v['server_api_areas'] = dict(collections.Counter(f.split('/')[3] for f in v['server_api_files']))
    v['server_api_areas_strict'] = dict(collections.Counter(f.split('/')[3] for f in v['server_api_files_strict']))
json.dump(use, open(sys.argv[2], 'w'), indent=1)
n = len(roots)
print(f"roots={n} in lib={sum(v['lib'] for v in use.values())} reached by server-api specs={sum(1 for v in use.values() if v['server_api_files'])} (named by spec/helper code: {sum(1 for v in use.values() if v['server_api_files_strict'])}) harness-used by client-web specs={sum(1 for v in use.values() if v['client_web_files'])} (named: {sum(1 for v in use.values() if v['client_web_files_strict'])})")
