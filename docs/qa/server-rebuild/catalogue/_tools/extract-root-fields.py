"""schema.graphql -> root-fields.tsv (kind, name, type, description) for Mutation, Query, Subscription."""
import re, sys
src = open(sys.argv[1]).read(); out = []
for root in ('Mutation', 'Query', 'Subscription'):
    m = re.search(r'^type %s \{\n(.*?)^\}' % root, src, re.S | re.M)
    if not m: continue
    for fm in re.finditer(r'(?:"""(.*?)"""\s*)?^  ([a-zA-Z][a-zA-Z0-9_]*)(\([^)]*\))?\s*:\s*([^\n]+)$', m.group(1), re.S | re.M):
        out.append((root, fm.group(2), fm.group(4).strip(), (fm.group(1) or '').strip().replace('\n', ' ')))
open(sys.argv[2], 'w').write('\n'.join('\t'.join(r) for r in out) + '\n'); print(len(out))
