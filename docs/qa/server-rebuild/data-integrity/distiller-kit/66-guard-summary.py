#!/usr/bin/env python3
"""66-guard-summary.py: one PASS / FAIL line per guard over a run folder.

Reads the output files that run-guards.sh (and the hand-run scripts) wrote to
runs/<label>/ and compares every guard with its row in
66-guard-expectations.tsv. Read-only: it never touches a database.

usage:
  66-guard-summary.py <label|run-folder> [--mode source|distilled]
        [--baseline <label>] [--save-baseline [--force]] [--strict]
        [--source <label>] [--only FAIL,MOVED,...] [--propose]

  --mode source      the dataset is a source backup before reject and repair
                     (default). Kept-and-tracked counts are compared with the
                     stored baseline of the label and reported SAME or MOVED.
  --mode distilled   the dataset is the new database after reject and repair.
  --source L         distilled mode: the label of the run on the SOURCE backup the new
                     database was made from. Guards of kind as-source must read
                     exactly what they read there (66-baselines/L.source.tsv).
  --baseline L       compare baseline guards with the baseline stored for
                     label L instead of the run's own label.
  --save-baseline    store the readings of this run as the baseline of its
                     label (66-baselines/<label>.<mode>.tsv).
  --strict           MOVED, UNDECIDED and NO BASELINE also give exit code 1.
  --propose          print expectation rows for headings that have no row
                     yet (a first guess for a person to review), then stop.

exit code: 0 no FAIL; 1 at least one FAIL (or, with --strict, MOVED,
UNDECIDED or NO BASELINE); 2 usage error.

The summary prints guard keys, column names and counts only. It never prints
a data row, so no id, name or e-mail reaches it.
"""
import hashlib, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXPECT = os.path.join(HERE, '66-guard-expectations.tsv')
BASEDIR = os.path.join(HERE, '66-baselines')
SIDES = ('synapse', 'kratos', 'hydra', 'assistant', 'filebackup', 'wopi')
NOISE = re.compile(r'^(NOTICE:|DROP |CREATE |DO$|SET$|BEGIN$|ROLLBACK$|COMMIT$|ANALYZE$|TRUNCATE|ALTER |'
                   r'Pager usage|real\t|user\t|sys\t|Timing is|Time: )')
COUNTLINE = re.compile(r'^(INSERT 0|SELECT|COPY|UPDATE|DELETE) \d+$')
SEP = re.compile(r'^-+(\+-+)*$')
FOOT = re.compile(r'^\(\d+ rows?\)$')
NUM = re.compile(r'^-?\d[\d,]*(\.\d+)?$')
ERR = re.compile(r'^(ERROR:|FATAL:|psql:|Traceback |.*: command not found)')


def slot_of(fname):
    m = re.match(r'^(\d+(?:-\d+)?)-(.+)\.out$', fname)
    if not m:
        return None
    num, db = m.group(1), m.group(2)
    if num == '39':
        for s in SIDES:
            if db == s or db.endswith('_' + s) or db.endswith(s):
                return '39-' + s
        return '39-' + db
    return num


def key_of(line):
    """Stable key of a heading: marker plus the text before the first ': ', ' (' or ' = '."""
    marker, text = line[:3], line[4:].strip()
    cut = len(text)
    for tok in (': ', ' (', ' = '):
        i = text.find(tok)
        if 0 < i < cut:
            cut = i
    key = text[:cut].rstrip(':').strip()
    if not re.search(r'\d', key) and len(key) < 20 and text[cut:cut + 2] == ': ':
        # a generic lead-in such as "closure scan": add the next part, numbers masked
        rest = text[cut + 2:]
        c2 = len(rest)
        for tok in (' (', ' = ', ': '):
            j = rest.find(tok)
            if 0 < j < c2:
                c2 = j
        key += ': ' + re.sub(r'\d[\d,]*', 'N', rest[:c2]).strip()
    return ('=== ' if marker == '===' else '') + key[:90]


def num(cell):
    c = cell.strip()
    if NUM.match(c):
        return float(c.replace(',', ''))
    return None


class Block:
    def __init__(self, key, heading):
        self.key, self.heading = key, heading
        self.tables = []      # (header list, [row lists])
        self.free = []        # non-table result lines
        self.counts = []      # INSERT 0 n / SELECT n lines
        self.notes = []       # annotation headings merged into this block

    def rows(self):
        return sum(len(r) for _, r in self.tables)

    def nonzero(self):
        """(column, value) of every numeric cell that is not 0; free lines count too."""
        out = []
        for hdr, rows in self.tables:
            for r in rows:
                for i, c in enumerate(r):
                    v = num(c)
                    if v:
                        out.append((hdr[i] if i < len(hdr) else '?', c.strip()))
        for line in self.free:
            for tok in re.split(r'[|\s]+', line):
                v = num(tok)
                if v:
                    out.append(('line', tok))
        return out

    def digest(self):
        h = hashlib.sha256()
        h.update(re.sub(r'\s+', ' ', self.heading).encode())
        for n in self.notes:
            h.update(b'\nN ' + re.sub(r'\s+', ' ', n).encode())
        for hdr, rows in self.tables:
            h.update(('\nT ' + '|'.join(hdr)).encode())
            for r in sorted('|'.join(c.strip() for c in r) for r in rows):
                h.update(('\nR ' + r).encode())
        for line in self.free:
            h.update(('\nF ' + re.sub(r'\s+', ' ', line.strip())).encode())
        for line in self.counts:
            h.update(('\nC ' + line).encode())
        return h.hexdigest()[:16]

    def shape(self):
        nz = self.nonzero()
        s = '%d table(s), %d row(s)' % (len(self.tables), self.rows())
        if self.free:
            s += ', %d line(s)' % len(self.free)
        cells = [c for _, rows in self.tables for r in rows for c in r]
        if len(cells) == 1 and num(cells[0]) is not None:
            return 'reads ' + cells[0].strip()
        return s + ', %d non-zero number(s)' % len(nz)


def parse(path, notes_keys, known_keys):
    """Split one output file into blocks. These heading lines are annotations of the block
    before them, not guards of their own: a '--- Acceptance' line; a key the expectation
    file marks as kind note; and a '--- ' line that follows a heading with nothing in
    between (a heading written on several lines), unless that line has its own row."""
    blocks, errors, cur, content = [], 0, None, False
    with open(path, encoding='utf-8', errors='replace') as f:
        lines = [l.rstrip('\n') for l in f]
    i, seen = 0, {}
    while i < len(lines):
        line = lines[i]
        if ERR.match(line):
            errors += 1
        if line.startswith('--- ') or line.startswith('=== '):
            k = key_of(line)
            if cur is not None and (k.startswith('Acceptance') or k in notes_keys or
                                    (not content and line.startswith('--- ') and cur.heading.startswith('--- ')
                                     and k not in known_keys)):
                cur.notes.append(line)
            else:
                content = False
                seen[k] = seen.get(k, 0) + 1
                if seen[k] > 1:
                    k = '%s #%d' % (k, seen[k])
                cur = Block(k, line)
                blocks.append(cur)
            i += 1
            continue
        if not line.strip():
            i += 1
            continue
        content = True
        if line.startswith('NOTICE:') and cur is not None and 'skipping' not in line and 'seconds' not in line:
            cur.free.append(line[7:].strip())   # a DO block reports its reading as a NOTICE
            i += 1
            continue
        if cur is None or NOISE.match(line) or FOOT.match(line):
            i += 1
            continue
        if COUNTLINE.match(line):
            cur.counts.append(line)
            i += 1
            continue
        if i + 1 < len(lines) and SEP.match(lines[i + 1]) and lines[i + 1].strip():
            hdr = [c.strip() for c in line.split('|')]
            rows, i = [], i + 2
            while i < len(lines) and lines[i].strip() and not FOOT.match(lines[i]) \
                    and not lines[i].startswith(('--- ', '=== ')):
                rows.append(lines[i].split('|'))
                i += 1
            cur.tables.append((hdr, rows))
            continue
        cur.free.append(line)
        i += 1
    return blocks, errors


def load_expectations():
    rows, slots, order = {}, {}, []
    if not os.path.exists(EXPECT):
        return rows, slots, order
    with open(EXPECT, encoding='utf-8') as f:
        for n, line in enumerate(f, 1):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'):
                continue
            p = line.split('\t')
            if p[0] == '@slot':
                slots[p[1]] = p[2]
                continue
            if len(p) < 4:
                sys.exit('%s line %d: need slot, key, source, distilled, reason' % (EXPECT, n))
            if (p[0], p[1]) in rows:
                sys.exit('%s line %d: second row for %s / %s' % (EXPECT, n, p[0], p[1]))
            rows[(p[0], p[1])] = (p[2], p[3], p[4] if len(p) > 4 else '')
            order.append((p[0], p[1]))
    return rows, slots, order


SRC = {}      # (slot, key) -> digest of the reading on the source run (--source)
SRC_GIVEN = [False]


def check(kind, b, base, src=None):
    """Return (status, expected text, detail). Several checks may be joined with ' ; ':
    all must pass."""
    if ' ; ' in kind:
        res = [check1(k.strip(), b, base, src) for k in kind.split(' ; ')]
        bad = [r for r in res if r[0] != 'PASS']
        return (bad[0][0] if bad else 'PASS', ' ; '.join(r[1] for r in res), (bad[0] if bad else res[0])[2])
    return check1(kind, b, base, src)


def check1(kind, b, base, src=None):
    nz = b.nonzero()
    def some(pairs):
        cols = []
        for c, v in pairs:
            if c not in [x for x, _ in cols]:
                cols.append((c, v))
        return ', '.join('%s=%s' % cv for cv in cols[:4]) + (' ...' if len(cols) > 4 else '')
    if kind == 'zero':
        return ('PASS', 'every number 0', b.shape()) if not nz else \
               ('FAIL', 'every number 0', '%d non-zero: %s' % (len(nz), some(nz)))
    if kind.startswith('zero-but:'):
        skip = kind[9:]
        bad = []
        for hdr, rows in b.tables:
            for r in rows:
                if skip in r[0]:
                    continue
                for i, c in enumerate(r):
                    if num(c):
                        bad.append((hdr[i] if i < len(hdr) else '?', c.strip()))
        exp = 'every number 0 except on rows marked "%s"' % skip
        return ('PASS', exp, b.shape()) if not bad else ('FAIL', exp, '%d non-zero: %s' % (len(bad), some(bad)))
    if kind.startswith('row:'):
        _, label, pair = kind.split(':', 2)
        col, want = pair.split('=', 1)
        hits, bad = 0, []
        for hdr, rows in b.tables:
            if col in hdr:
                j = hdr.index(col)
                for r in rows:
                    if label in r[0]:
                        hits += 1
                        if r[j].strip() != want:
                            bad.append((col, r[j].strip()))
        exp = '%s=%s on the row "%s"' % (col, want, label)
        if not hits:
            return 'FAIL', exp, 'no such row or column in the output'
        return ('PASS', exp, b.shape()) if not bad else ('FAIL', exp, 'reads ' + some(bad))
    if kind.startswith('match:'):
        rx = re.compile(kind[6:])
        ok = any(rx.search(l) for l in b.free + [b.heading] + b.notes)
        return ('PASS' if ok else 'FAIL'), 'a line matching /%s/' % kind[6:], b.shape() if ok else 'no line matches'
    if kind == 'empty':
        n = b.rows() + len(b.free)
        return ('PASS', 'no rows', 'no rows') if n == 0 else ('FAIL', 'no rows', '%d row(s)' % n)
    if kind.startswith('equals:'):
        want = kind[7:]
        cells = [c.strip() for _, rows in b.tables for r in rows for c in r]
        if len(cells) != 1:
            return 'FAIL', 'one cell = ' + want, 'block holds %d cells, not one' % len(cells)
        return ('PASS' if cells[0] == want else 'FAIL'), 'one cell = ' + want, 'reads ' + cells[0]
    if kind.startswith('head:'):
        want = kind[5:]
        m = re.search(r' = (-?\d+)', b.heading)
        got = m.group(1) if m else 'no number'
        return ('PASS' if got == want else 'FAIL'), 'heading value = ' + want, 'reads ' + got
    if kind.startswith('cells:'):
        bad, miss = [], []
        for pair in kind[6:].split(','):
            col, want = pair.split('=', 1)
            found = False
            for hdr, rows in b.tables:
                if col in hdr:
                    found = True
                    j = hdr.index(col)
                    for r in rows:
                        got = r[j].strip() if j < len(r) else ''
                        if got != want:
                            bad.append((col, got))
            if not found:
                miss.append(col)
        if miss:
            return 'FAIL', kind[6:], 'column not in the output: ' + ', '.join(miss)
        return ('PASS', kind[6:], b.shape()) if not bad else ('FAIL', kind[6:], '%d cell(s) differ: %s' % (len(bad), some(bad)))
    if kind == 'baseline':
        if base is None:
            return 'NO BASELINE', 'same as the stored baseline', b.shape() + ' (no baseline stored for this guard)'
        return ('SAME', 'same as the stored baseline', b.shape()) if base == b.digest() else \
               ('MOVED', 'same as the stored baseline', b.shape() + ', differs from the baseline')
    if kind.startswith('open:'):
        # a known open item: the check does not pass and somebody owns the work. Never PASS, never hidden.
        return 'OPEN', 'open item: ' + kind[5:], b.shape()
    if kind == 'as-source':
        exp = 'the same reading as on the source backup'
        if not SRC_GIVEN[0]:
            return 'NO BASELINE', exp, b.shape() + ' (give --source <label of the source run>)'
        if src is None:
            return 'FAIL', exp, 'the source run has no such guard'
        return ('PASS', exp, b.shape()) if src == b.digest() else ('FAIL', exp, b.shape() + ', differs from the source')
    if kind == 'agreed':
        exp = 'the agreed reading of this dataset'
        if base is None:
            return 'NO BASELINE', exp, b.shape() + ' (read it, then --save-baseline)'
        return ('PASS', exp, b.shape()) if base == b.digest() else ('FAIL', exp, b.shape() + ', differs from the agreed reading')
    if kind == 'undecided':
        note = '' if base is None else (', same as the baseline' if base == b.digest() else ', differs from the baseline')
        return 'UNDECIDED', 'not ruled yet', b.shape() + note
    if kind in ('info', 'section'):
        return 'INFO', '-', b.shape()
    return 'FAIL', kind, 'unknown kind in the expectation file'


def propose(slot, b):
    """First guess for a heading with no expectation row. A person reviews it."""
    h = b.heading.lower()
    simple = re.search(r'\(expect(s)? (0|none|no rows|no lines|empty)( everywhere)?[;)]', h) or \
             re.search(r'[(;] ?expect(s)? (0|none|no rows|no lines)\)?$', h)
    if not b.tables and not b.free:
        if b.heading.startswith('===') and b.counts:
            return 'baseline', 'undecided', 'section that holds row counts of the classifier steps'
        if b.heading.startswith('==='):
            return 'section', 'section', 'section marker, must be present'
        return ('empty', 'empty', 'heading expects none, reads none') if 'expect' in h else \
               ('baseline', 'undecided', 'no output lines on acceptance')
    if simple:
        if not b.nonzero():
            return 'zero', 'zero', 'heading expects zero, holds on acceptance'
        return 'baseline', 'zero', 'heading expects zero, acceptance reads non-zero (known finding)'
    if 'expect' in h:
        return 'baseline', 'undecided', 'heading states a partial expectation, not encoded yet'
    return 'baseline', 'undecided', 'no expectation in the heading'


def main():
    a = sys.argv[1:]
    def flag(name, has_val=False):
        if name in a:
            i = a.index(name)
            if has_val:
                v = a[i + 1]
                del a[i:i + 2]
                return v
            del a[i]
            return True
        return None
    mode = flag('--mode', True) or 'source'
    baseline_label = flag('--baseline', True)
    source_label = flag('--source', True)
    save, force, strict, prop = flag('--save-baseline'), flag('--force'), flag('--strict'), flag('--propose')
    only = flag('--only', True)
    if len(a) != 1 or mode not in ('source', 'distilled'):
        sys.stderr.write(__doc__)
        sys.exit(2)
    run = a[0] if os.path.isdir(a[0]) else os.path.join(HERE, 'runs', a[0])
    if not os.path.isdir(run):
        sys.exit('no run folder: ' + run)
    label = os.path.basename(os.path.normpath(run))
    exp, slots, order = load_expectations()
    notes_by_slot = {}
    for (s, k), (src, dis, _) in exp.items():
        if src == 'note':
            notes_by_slot.setdefault(s, set()).add(k)

    found, file_errors, dup = {}, {}, []
    for fname in sorted(os.listdir(run)):
        s = slot_of(fname)
        if s is None or not os.path.isfile(os.path.join(run, fname)):
            continue
        if s in found:
            dup.append(fname)
            continue
        blocks, errs = parse(os.path.join(run, fname), notes_by_slot.get(s, set()),
                              {k for (es, k) in exp if es == s})
        found[s] = (fname, blocks)
        file_errors[s] = errs

    if prop:
        for s, (fname, blocks) in found.items():
            for b in blocks:
                if (s, b.key) not in exp:
                    src, dis, why = propose(s, b)
                    print('\t'.join((s, b.key, src, dis, why)))
        return

    bfile = os.path.join(BASEDIR, '%s.%s.tsv' % (baseline_label or label, mode))
    base = {}
    if os.path.exists(bfile):
        with open(bfile, encoding='utf-8') as f:
            for line in f:
                p = line.rstrip('\n').split('\t')
                if len(p) >= 3 and not line.startswith('#'):
                    base[(p[0], p[1])] = p[2]

    if source_label:
        sfile = os.path.join(BASEDIR, '%s.source.tsv' % source_label)
        if not os.path.exists(sfile):
            sys.exit('no stored source readings: ' + sfile + ' (run 66-guard-summary.py %s --save-baseline)' % source_label)
        SRC_GIVEN[0] = True
        with open(sfile, encoding='utf-8') as f:
            for line in f:
                p = line.rstrip('\n').split('\t')
                if len(p) >= 3 and not line.startswith('#'):
                    SRC[(p[0], p[1])] = p[2]
    col = 2 if mode == 'source' else 3
    results, tot = [], {}
    def add(status, slot, key, expected, detail):
        results.append((status, slot, key, expected, detail))
        tot[status] = tot.get(status, 0) + 1

    for s in sorted(set(slots) | set(found) | {k[0] for k in exp}):
        if s not in found:
            need = slots.get(s, 'optional')
            add('FAIL' if need == 'required' else 'NOT RUN', s, '(whole file)', 'output file present',
                'no output file in the run folder' + ('' if need == 'required' else ' (%s)' % need))
            continue
        fname, blocks = found[s]
        if file_errors[s]:
            add('FAIL', s, '(whole file)', 'no error line', '%d error line(s) in %s' % (file_errors[s], fname))
        seen = set()
        for b in blocks:
            seen.add(b.key)
            e = exp.get((s, b.key))
            if e is None:
                add('FAIL', s, b.key, 'a row in the expectation file', 'heading has no expectation row')
                continue
            kind = e[col - 2]
            st, expected, detail = check(kind, b, base.get((s, b.key)), SRC.get((s, b.key)))
            add(st, s, b.key, expected, detail)
        for (es, ek) in order:
            if es == s and ek not in seen and exp[(es, ek)][0] != 'note':
                add('FAIL', s, ek, 'heading present in the output', 'expectation row has no heading in the output')
    for fname in dup:
        add('FAIL', slot_of(fname), '(whole file)', 'one output file per slot', 'second file for the slot: ' + fname)

    if save:
        os.makedirs(BASEDIR, exist_ok=True)
        out = os.path.join(BASEDIR, '%s.%s.tsv' % (label, mode))
        if os.path.exists(out) and not force:
            sys.exit('baseline exists, use --force to replace it: ' + out)
        with open(out, 'w', encoding='utf-8') as f:
            f.write('# baseline of run %s, mode %s: slot, guard key, digest of the reading, shape\n' % (label, mode))
            for s, (fname, blocks) in sorted(found.items()):
                for b in blocks:
                    f.write('\t'.join((s, b.key, b.digest(), b.shape())) + '\n')
        print('baseline saved: ' + out)
        return

    show = set(only.split(',')) if only else None
    print('guard summary: run %s, mode %s, baseline %s' % (label, mode, os.path.basename(bfile) if base else 'none stored'))
    for st, s, k, expected, detail in results:
        if show is None or st in show:
            print('%-11s %-13s %-62s expect: %s | %s' % (st, s, k[:62], expected, detail))
    order_st = ('PASS', 'SAME', 'INFO', 'MOVED', 'NO BASELINE', 'UNDECIDED', 'OPEN', 'NOT RUN', 'FAIL')
    print('totals: ' + ', '.join('%s %d' % (st, tot.get(st, 0)) for st in order_st) + ', guards %d' % len(results))
    bad = tot.get('FAIL', 0)
    soft = tot.get('MOVED', 0) + tot.get('UNDECIDED', 0) + tot.get('NO BASELINE', 0) + tot.get('OPEN', 0)
    verdict = 'FAIL' if bad or (strict and soft) else 'PASS'
    print('VERDICT: %s%s' % (verdict, '' if not soft or strict else ' (with %d line(s) for a person to read: MOVED, UNDECIDED, NO BASELINE or OPEN)' % soft))
    sys.exit(1 if verdict == 'FAIL' else 0)


if __name__ == '__main__':
    main()
