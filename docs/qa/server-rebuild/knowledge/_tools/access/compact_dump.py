#!/usr/bin/env python3
"""Compact view of the ACC aggregate dumps.
usage: shapes.py sections <file> <section-prefix>   -> per group: top-1 full shape, others as +/- diffs
       shapes.py rules <sec2.txt> <type> [<type>...]  -> rule-level shapes with repeated criteria collapsed
"""
import sys, re, collections

def collapse(criteria):
    parts = [p for p in criteria.split(',') if p]
    c = collections.Counter(parts)
    return ','.join(f"{k}x{v}" if v > 1 else k for k, v in sorted(c.items()))

def norm_rule(rule):
    f = rule.split('|')
    if len(f) < 4:
        return rule
    name, cascade, privs, crit = f[0], f[1], f[2], '|'.join(f[3:])
    return f"{name} | cascade={cascade} | {privs} | {collapse(crit)}"

def sections(path, prefix):
    lines = open(path, encoding='utf-8', errors='replace').read().splitlines()
    i = 0
    while i < len(lines) and not lines[i].startswith(prefix):
        i += 1
    if i >= len(lines):
        print('section not found'); return
    print(lines[i]); i += 1
    header = lines[i].split('|'); i += 1
    print('columns:', header)
    groups = collections.OrderedDict()
    while i < len(lines) and not lines[i].startswith('==='):
        row = lines[i].split('|'); i += 1
        if len(row) < len(header):
            continue
        shape_idx = header.index('shape')
        key = tuple(row[:shape_idx]) if 'rn' not in header else tuple(v for h, v in zip(header, row) if h not in ('n', 'rn', 'shape', 'pshape'))
        n = row[header.index('n')] if 'n' in header else ''
        pshape = row[header.index('pshape')] if 'pshape' in header else None
        shape = '|'.join(row[shape_idx:])
        rules = sorted(set(norm_rule(r.strip()) for r in shape.split(' ;; ') if r.strip()))
        groups.setdefault(key, []).append((n, rules, pshape))
    for key, variants in groups.items():
        print(f"\n## group {dict(zip([h for h in header if h not in ('n','rn','shape','pshape')], key))}")
        base = variants[0][1]
        print(f"  [top shape, n={variants[0][0]}]" + (f" privilegeRules: {variants[0][2]}" if variants[0][2] else ''))
        for r in base:
            print('    ' + r)
        for n, rules, pshape in variants[1:]:
            added = [r for r in rules if r not in base]
            removed = [r for r in base if r not in rules]
            print(f"  [variant n={n}]" + (f" privilegeRules: {pshape}" if pshape and pshape != variants[0][2] else ''))
            for r in removed: print('    - ' + r)
            for r in added: print('    + ' + r)

def rules(path, types):
    agg = collections.OrderedDict()
    for line in open(path, encoding='utf-8', errors='replace'):
        f = line.rstrip('\n').split('|')
        if len(f) != 6 or f[0] not in types:
            continue
        t, name, cascade, privs, crit, n = f
        key = (t, f"{name} | cascade={cascade} | {privs} | {collapse(crit)}")
        agg[key] = agg.get(key, 0) + int(n)
    cur = None
    for (t, k), n in sorted(agg.items(), key=lambda kv: (kv[0][0], -kv[1])):
        if t != cur:
            print(f"\n## {t}"); cur = t
        print(f"  {n:>7}  {k}")

if __name__ == '__main__':
    if sys.argv[1] == 'sections':
        sections(sys.argv[2], sys.argv[3])
    else:
        rules(sys.argv[2], sys.argv[3:])
