#!/usr/bin/env python3
"""47-output-diff.py: compare two outputs of script 30, section by section.

usage: 47-output-diff.py <untouched.txt> <repaired.txt>

Order inside a section does not count, and psql notices and bare command tags
are left out, so only numbers that really moved are listed. A line with "<"
is only in the first output, a line with ">" only in the second.
"""
import collections
import re
import sys

NOISE = re.compile(r"^(NOTICE:|DROP TABLE|ANALYZE|CREATE INDEX|DO$|\s*$)")


def sections(path):
    out = collections.OrderedDict()
    cur = "(top)"
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if line.startswith("=== "):
                cur = line
                out.setdefault(cur, collections.Counter())
                continue
            if NOISE.match(line):
                continue
            out.setdefault(cur, collections.Counter())[line] += 1
    return out


def main():
    a, b = sections(sys.argv[1]), sections(sys.argv[2])
    moved = 0
    for name in list(a) + [n for n in b if n not in a]:
        ca, cb = a.get(name, collections.Counter()), b.get(name, collections.Counter())
        only_a, only_b = ca - cb, cb - ca
        if not only_a and not only_b:
            continue
        print(name)
        for line, n in only_a.items():
            print("  < " + line + (f"   (x{n})" if n > 1 else ""))
        for line, n in only_b.items():
            print("  > " + line + (f"   (x{n})" if n > 1 else ""))
        moved += sum(only_a.values()) + sum(only_b.values())
    print(f"output diff: {moved} lines moved in {sys.argv[2]}")


if __name__ == "__main__":
    main()
