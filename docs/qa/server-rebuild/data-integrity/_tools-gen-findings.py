#!/usr/bin/env python3
"""Generates findings-by-feature.md. The table F is hand-maintained; the index by feature is computed.
usage (from the repo root): python3 -I docs/qa/server-rebuild/data-integrity/_tools-gen-findings.py"""
import re, os, collections
here = os.path.dirname(os.path.abspath(__file__))
cat = open(os.path.join(here, '..', 'catalogue', 'README.md'), encoding='utf-8').read()
FEAT = dict(re.findall(r'^\| ([A-Z]{2}-\d+) \| ([^|]+?) \|', cat, re.M))
ACC, PRO = 'accepted', 'proposed'
# (id, title, class, acceptance count, catalogue features, QA ruling in one line, status, guards, tracked cases)
F = [
('A1', 'Leftover migration backup tables', 'orphaned', '5,322 rows in 6 tables (8,423 in 12 with the stale ones)', 'OP-1 AI-1',
 'Reject by table. Exception: keep the one table that maps 450 old virtual contributor ids in room thread data until those are rewritten (C3)', ACC, 'A1 G1–G2', '—'),
('A2', 'Accounts and licences that belong to nobody', 'orphaned', '712 rows (43 accounts)', 'SP-13 LI-1',
 'Reject, after the guards read 0. 2 accounts carry an outside subscription id: look up the billing record first', ACC, 'A2 1–4', '—'),
('A3', 'Space structure with no owner', 'orphaned', '762 rows', 'SP-6 SP-8 SP-10 CT-14 CM-6',
 'Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed)', ACC, 'A3 G1–G8', '—'),
('A4', 'Unreferenced classification and tag-template containers', 'orphaned', '4,295 rows', 'SP-9 SP-6',
 'Reject, after the guards show no live callout or callouts set lost its container', ACC, 'A4 G1–G8', '—'),
('A5', 'Profiles, tags, locations, visuals and references with no owner', 'orphaned', '6,729 rows', 'ID-3 SP-2 SP-6',
 'Reject or follow the owner. A profile that a live row still names is a repair, not a reject', ACC, 'A5 G1–G4', '—'),
('A6', 'Storage, files and documents with no owner', 'orphaned', '3,772 rows', 'CT-9 CT-4 CT-6 SP-6',
 'Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it', ACC, 'A6 G1–G9, body scans', '—'),
('A7', 'AI personas, virtual contributors and knowledge bases with no owner', 'orphaned', '192 rows', 'AI-1 AI-2',
 'Reject the 159 personas and 3 knowledge bases. Keep the 10 virtual contributors whose knowledge source is gone, unchanged, and track them', ACC, 'A7 G1–G15', 'T1'),
('A8', 'Credentials with no holder or pointing at deleted things', 'orphaned', '178 rows', 'MB-4 MB-8 SP-6',
 'Reject. No live role definition uses a deleted id', ACC, 'A8 G1–G12', '—'),
('A9', 'Authorization policies held by nothing', 'orphaned', '23,258 rows', 'MB-9 SP-6 CM-1',
 'Reject, except 130 policies that belong to the kept virtual contributors. 58 live conversations with an empty rule are kept and tracked', ACC, 'A9 G1–G19', '—'),
('A10', 'Activity entries, rooms and conversations of deleted owners', 'orphaned', '966 rows', 'CT-12 CT-3 CM-1 CM-6',
 'Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step', ACC, 'A10 G1–G9', 'T2'),
('A11', 'Small leftovers', 'orphaned', '223 rows', 'MB-2 MB-7 ID-3 ID-6',
 'Reject. 3 keys of the web assistant that looked orphaned are valid and kept', ACC, 'A11 G1–G9', '—'),
('B1', 'Duplicate or empty names where the old system requires unique ones', 'bug heritage', '96 rows (104 by the QA rule)', 'CT-1 CT-4 CT-14 CT-15 CM-1 SP-8',
 'Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet', ACC, 'B1 G1–G18', 'T3, T30'),
('B2', 'Spaces with an inconsistent hierarchy or a forbidden name', 'bug heritage', '13 spaces', 'SP-4 SP-5 SP-7 SP-11',
 'Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word', ACC, 'B2 G1–G20', 'T4, T32'),
('B3', 'Content that contradicts its declared type', 'bug heritage', '115 rows', 'CT-1 CT-2 CT-4 CT-6 MB-3',
 'Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first', ACC, 'B3 G1–G15', 'T5, T6'),
('B4', 'Values outside the allowed vocabulary', 'bug heritage', '955 rows', 'MB-9 LI-1 CT-9 CT-10 MB-3 SP-8',
 'Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed', ACC, 'B4 G1–G16', 'T7, T8'),
('B5', 'Files breaking their bucket limits', 'bug heritage', '7 files', 'CT-9 CT-6',
 'Keep all 7. Three checks are open: a running server, production counts, bucket limits on import', ACC, 'B5 G1–G8', 'T9'),
('C1', 'Organizations without an owner', 'valid', '127 organizations (architect 125)', 'MB-7',
 'Keep all, change nothing. An organization without an owner is valid data. Product decides for the 40 nobody can act for', ACC, 'C1 G1–G11', 'T10'),
('C2', 'Users without a login binding', 'valid', '13 users', 'ID-1 ID-4',
 'Keep all 13. Users are never deleted. The impact is settled later from production counts and team knowledge', ACC, 'C2 G1–G7', 'T11'),
('C3', 'Virtual contributor conversation bindings', 'valid', '515 bindings in 237 rooms', 'AI-1 CT-3',
 'Rewrite 428 old ids, remove 25 bindings that name no virtual contributor, keep the rest. 362 bindings sit on thread ids the chat server no longer has', PRO, 'C3 G1–G6', 'T12'),
('C4', 'Credential hygiene', 'valid', '13,119 credentials', 'LI-1 MB-4 MB-8 AI-1',
 'Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked', PRO, 'C4 G1–G20', 'T13–T16'),
('C5', 'Missing creator and author attribution', 'valid', '123 person ids that name nobody, in 17 columns', 'CT-1 CT-12 CM-4 ID-4',
 'Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data', PRO, 'C5 G1–G13', 'T17, T18'),
('C6', 'File contents missing from storage', 'not classified', '730 stored files on 1,501 file rows; 729 with no off-site copy', 'CT-9 CT-6',
 'Keep every file row and link. Counted from a listing of the acceptance file store on 2026-11-16, which matches the architect', PRO, 'C6 G1–G12, volume check', 'T19–T21'),
('C7', 'URL handles: invalid, reserved, duplicate and colliding names', 'valid', '66 handles fail the new rule', 'SP-11 SP-7 CT-1',
 'Keep every handle; a rename breaks an address with no redirect. One callout with no handle gets one (repair rehearsed)', PRO, 'C7 G1–G13', 'T22, T23'),
('C8', 'Role definitions scoped to the wrong space', 'not classified', '162 definitions in 54 spaces', 'MB-4 SP-4 SP-5',
 'Repair in five steps that go together, so that nobody loses a role (rehearsed). One-entry parent lists on second-level subspaces are a live generator and are tracked', PRO, 'C8 G1–G15', 'T24–T26'),
('C9', 'Other visible inconsistencies', 'valid', 'see the parts', 'SP-2 SP-8 CT-2 MB-7',
 'Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern', PRO, 'C9 G1–G15', 'T27–T29'),
]
for f in F:
    for x in f[4].split(): assert x in FEAT, x
# register row (acc-defect-register.md) -> the findings that cover it
REG = {'A1': 'C8', 'A2': 'C8', 'A3': 'C8', 'A4': 'C8', 'A7': 'C4', 'B1': 'A8 C4', 'B2': 'A8', 'B3': 'C4', 'B4': 'C4', 'B5': 'C4',
 'C1': 'B2', 'C2': 'B2 C7', 'C5': 'B4 C6', 'D2': 'B4 A10', 'D5': 'A11', 'E1': 'C2', 'E2': 'C1', 'E3': 'A2', 'E4': 'A11', 'E5': 'A7', 'E6': 'C7',
 'F2': 'B3', 'F3': 'B1', 'F4': 'A3', 'F5': 'A3 A5 A10', 'F6': 'A6', 'F7': 'C9', 'F8': 'A10 C5', 'F9': 'C5', 'G1': 'A9', 'H1': 'A1',
 'I1': 'C2', 'I2': 'C2', 'K1': 'C1', 'K4': 'C4', 'L1': 'B1 B4', 'L2': 'B1', 'L5': 'C9', 'L6': 'B1', 'M1': 'C6', 'M2': 'C9', 'M5': 'C5',
 'P1': 'A3 A10', 'P5': 'A3', 'S1': 'C6', 'S2': 'C6', 'T1': 'A10'}
IDS = [f[0] for f in F]
for k, v in REG.items():
    for x in v.split(): assert x in IDS, (k, x)
COL = 'Finding (2026-11 review)'
rp = os.path.join(here, 'acc-defect-register.md'); R = open(rp, encoding='utf-8').read().split('\n'); seen = set()
for i, l in enumerate(R):
    if not l.startswith('|'): continue
    c = l.rstrip().rstrip('|').split('|')[1:]
    first = c[0].strip()
    if first == '#':
        if c[-1].strip() == COL: continue
        R[i] = l.rstrip() + f' {COL} |'
    elif set(first) <= set('-') and first and i and R[i-1].startswith('| # |') and R[i-1].rstrip().endswith(COL + ' |'):
        if len(c) < len(R[i-1].rstrip().rstrip('|').split('|')) - 1: R[i] = l.rstrip() + '---|'
    elif re.fullmatch(r'[A-Z]\d+', first):
        seen.add(first)
        cell = ', '.join(f'[{x}](findings-by-feature.md#{x.lower()})' for x in REG[first].split()) if first in REG else '—'
        hdr = next(R[j] for j in range(i, -1, -1) if R[j].startswith('| # |'))
        n = len(hdr.rstrip().rstrip('|').split('|')) - 1
        if len(c) == n: c[-1] = ' ' + cell + ' '; R[i] = '|' + '|'.join(c) + '|'
        else: assert len(c) == n - 1, (first, len(c), n); R[i] = l.rstrip() + f' {cell} |'
assert set(REG) <= seen, set(REG) - seen
open(rp, 'w', encoding='utf-8').write('\n'.join(R))
regof = collections.defaultdict(list)
for k, v in REG.items():
    for x in v.split(): regof[x].append(k)
link = lambda fid: f'[{fid}](../catalogue/README.md)'
o = []
o.append('# Data findings of the acceptance review, with their rulings (W4)\n')
o.append('_Acceptance data, backup of 2026-11-11, all seven databases restored locally. Counts only: no ids, names or e-mail addresses. Nothing here was applied to any database. Production was not analysed._\n')
o.append('The architect classified every row of the acceptance database by the rules of the legacy server and reported 25 findings in three classes. QA reviewed each finding on its own copy of the data, ruled what should happen to each part, and wrote a read-only guard for every check. This page lists each finding with its ruling, ties it to the rows of the [defect register](acc-defect-register.md) that describe the same data, and to the features of the [catalogue](../catalogue/README.md), so that a feature owner sees which data problems sit under the feature.\n')
o.append('**Not the same numbering as the register.** The ids A1 to C9 on this page are the architect\'s finding ids. The [defect register](acc-defect-register.md) of 2026-10-28 uses its own ids (A1 to T1) for QA\'s earlier signatures. The column *Register rows* names the register rows that describe the same data, and the register has a column that points back here. A register row with no finding was not part of the review of the architect.\n')
o.append('## How to read a row\n')
o.append('| Column | Meaning |\n|---|---|')
o.append('| Class | The architect\'s class. **orphaned**: the owner of the row is gone. **bug heritage**: the row breaks a rule of the legacy server. **valid**: allowed by the legacy rules but a problem. |')
o.append('| Ruling | What QA rules for the rows: reject (not copied to the new database), repair (copied, then corrected), keep (copied as stored), track (kept, with a follow-up). |')
o.append('| Status | **accepted**: the QA lead accepted the ruling. **proposed**: reviewed by QA, awaiting the QA lead. |')
o.append('| Guards | The read-only checks of the finding in the QA guard kit. The kit runs on any backup. It is not in this repository yet. |')
o.append('| Tracked | Cases of data that is kept on purpose, each with an owner follow-up (T-numbers of the kit). |')
o.append('')
o.append('## Findings\n')
for cls, title in (('A', 'A. Rows whose owner is gone'), ('B', 'B. Rows that break the old system\'s own rules'), ('C', 'C. Valid rows with notable problems')):
    o.append(f'### {title}\n')
    o.append('| ID | Finding | Class | Acceptance count | Register rows | Features | Ruling | Status | Guards | Tracked |\n|---|---|---|---|---|---|---|---|---|---|')
    for f in F:
        if f[0][0] != cls: continue
        regs = ', '.join(regof[f[0]]) or '—'
        feats = ', '.join(f'[{x}](#{x.lower()})' for x in f[4].split())
        o.append(f'| <a id="{f[0].lower()}"></a>{f[0]} | {f[1]} | {f[2]} | {f[3]} | {regs} | {feats} | {f[5]} | {f[6]} | {f[7]} | {f[8]} |')
    o.append('')
by = collections.OrderedDict((k, []) for k in FEAT)
for f in F:
    for x in f[4].split(): by[x].append(f)
o.append('## By feature\n')
o.append('Every catalogue feature that has at least one finding.\n')
for k, fs in by.items():
    if not fs: continue
    o.append(f'### {k}\n')
    o.append(f'{FEAT[k]}\n')
    o.append('| Finding | Ruling | Status |\n|---|---|---|')
    for f in fs: o.append(f'| [{f[0]}](#{f[0].lower()}) {f[1]} | {f[5]} | {f[6]} |')
    o.append('')
none = [k for k, fs in by.items() if not fs]
o.append('## Features with no finding\n')
o.append(', '.join(none) + '.\n')
o.append('No finding does not mean clean data: a row of a kind nobody has looked for is counted as valid.\n')
o.append('## Related, outside the 25 findings\n')
o.append('- **Register A1** (147 admin role definitions of subspaces that list a member credential of a space above, MB-4): a separate finding, counted by guard C8 G14. It is not repaired by C8.')
o.append('- **Live generators.** Some rows are still being created by the current server: the double credential grant (C4), the one-entry parent lists (C8, a regression of server#5203), bindings left behind when a virtual contributor is deleted (C3). Until the server is fixed, a clean-up does not stay clean.')
o.append('- **Outside the main database.** The chat server (A3, A10), the AI engine store (A7) and file storage (A6, C6) each need their own step.')
o.append('')
o.append('## What is not verified\n')
o.append('- **Production.** Every number is from acceptance. Production can hold kinds of bad data that acceptance does not have.')
o.append('- **A running server.** Server behaviour was read from the code of `alkem-io/server` `develop` (2026-11-10), not tried. Every repair was rehearsed on the local copy inside a transaction that was rolled back.')
o.append('- **The new server.** What it refuses or changes on import is not known for most findings and is listed as questions for the architect.')
o.append('')
o.append('## Maintenance\n')
o.append('Generated by `_tools-gen-findings.py` in this folder. The finding table is hand-maintained in that file; the index by feature is computed from it and checked against the catalogue\'s feature ids. The same run writes the column *Finding (2026-11 review)* into `acc-defect-register.md` from the table `REG`; it is safe to run again.')
open(os.path.join(here, 'findings-by-feature.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print('findings', len(F), 'features with a finding', len(by) - len(none))
