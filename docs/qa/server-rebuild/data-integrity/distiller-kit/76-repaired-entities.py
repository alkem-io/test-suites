#!/usr/bin/env python3
"""76-repaired-entities.py: list every row the repairs changed, with the place a person would open to look at it.
Compares the fields the eight repair files write (45, 48, 52, 54, 57, 58, 60, 61) between a database before the
repairs and one after, and resolves each changed row to its space path and callout handle.
Read only on both. The output file holds ids and handles: local only, never commit. Prints counts only.
usage: 76-repaired-entities.py <before_db> <after_db> <out.json>"""
import subprocess, sys, os, json, collections
BEF, AFT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
C = os.environ.get('DOCKER', 'alkemio_dev_postgres'); U = os.environ.get('PGUSER_', 'synapse')
def q(db, sql):
    r = subprocess.run(['docker', 'exec', '-i', C, 'psql', '-U', U, '-d', db, '-X', '-q', '-At', '-F', '\x1f'], input=sql, capture_output=True, text=True)
    if r.returncode or 'ERROR' in r.stderr: sys.exit(r.stderr[-1500:])
    return [l.split('\x1f') for l in r.stdout.splitlines() if l]
def both(sql): return dict((r[0], r[1:]) for r in q(BEF, sql)), dict((r[0], r[1:]) for r in q(AFT, sql))
def changed(sql):
    a, b = both(sql); return {k: (a[k], b[k]) for k in b if k in a and a[k] != b[k]}, [k for k in a if k not in b], [k for k in b if k not in a], a, b

# context: space path, callout -> space, room -> callout
PATH = """with recursive p as (
  select s.id, a."nameID"::text path, s.level, s."levelZeroSpaceID" l0 from space s join actor a on a.id=s.id where s."parentSpaceId" is null
  union all
  select s.id, p.path || case when s.level=1 then '/challenges/' else '/opportunities/' end || a."nameID", s.level, s."levelZeroSpaceID"
  from space s join actor a on a.id=s.id join p on p.id=s."parentSpaceId")
select id, path, level from p"""
space = {r[0]: {'path': '/' + r[1], 'level': int(r[2])} for r in q(AFT, PATH)}
callout = {r[0]: {'nameID': r[1], 'space': r[2] or None, 'visibility': r[3], 'isTemplate': r[4] == 't', 'framing': r[5], 'comments': r[6] or None, 'vc': r[7] or None}
           for r in q(AFT, """select c.id, c."nameID", coalesce(s.id::text,''), c.settings->>'visibility', c."isTemplate", c."framingId", coalesce(c."commentsId"::text,''), coalesce(v.id::text,'')
             from callout c left join collaboration co on co."calloutsSetId"=c."calloutsSetId" left join space s on s."collaborationId"=co.id
             left join knowledge_base kb on kb."calloutsSetId"=c."calloutsSetId" left join virtual_contributor v on v."knowledgeBaseId"=kb.id""")}
by_framing = {c['framing']: k for k, c in callout.items()}
def where(cid):
    c = callout.get(cid)
    if not c: return {'callout': cid}
    sp = space.get(c['space']) if c['space'] else None
    return {'callout': cid, 'nameID': c['nameID'], 'visibility': c['visibility'], 'isTemplate': c['isTemplate'], 'space': c['space'],
            'url': (sp['path'] + '/collaboration/' + c['nameID']) if sp else None, 'level': sp['level'] if sp else None, 'vc': c['vc']}
out = collections.OrderedDict()

# B3 (file 45)
ch, gone, new, a, b = changed('select id, type from callout_framing')
out['b3_framing_to_none'] = [dict(where(by_framing.get(k)), before=v[0][0], after=v[1][0]) for k, v in ch.items()]
ch, gone, new, a, b = changed('select id, "calloutId" from callout_contribution')
out['b3_removed_responses'] = [where(a[k][0]) for k in gone]
ch, gone, new, a, b = changed('select i.id, i."invitedToParent"::text, coalesce(s.id::text,\'\') from invitation i left join community c on c."roleSetId"=i."roleSetId" left join space s on s."communityId"=c.id')
out['b3_invitation_option'] = [{'invitation': k, 'space': v[1][1], 'url': space.get(v[1][1], {}).get('path')} for k, v in ch.items() if v[0][0] != v[1][0]]
# B4 (file 48)
ch, gone, new, a, b = changed('select p.id, coalesce(p."roleSetExtraRoles",\'\'), coalesce(s.id::text,\'\') from platform_invitation p left join community c on c."roleSetId"=p."roleSetId" left join space s on s."communityId"=c.id')
out['b4_platform_invitations'] = [{'invitation': k, 'space': v[1][1], 'url': space.get(v[1][1], {}).get('path')} for k, v in ch.items()]
for name, sql in (('b4_policy_types', 'select id, type from authorization_policy'), ('b4_licence_types', 'select id, type from license'),
                  ('b4_aggregator_types', 'select id, coalesce(type,\'\') from storage_aggregator'), ('b4_room_types', 'select id, type from room')):
    ch, *_ = changed(sql); out[name] = {'count': len(ch), 'pairs': dict(collections.Counter(f'{v[0][0]} -> {v[1][0]}' for v in ch.values()))}
    if name == 'b4_room_types': out[name]['rooms'] = list(ch)
# C3 (file 52)
ch, *_ = changed('select id, md5(coalesce("vcData"::text,\'\')) from room')
room_callout = {r[0]: r[1] for r in q(AFT, 'select "commentsId", id from callout where "commentsId" is not null')}
room_post = {r[0]: r[1] for r in q(AFT, 'select p."commentsId", cc."calloutId" from post p join callout_contribution cc on cc."postId"=p.id where p."commentsId" is not null')}
out['c3_rooms'] = [dict(where(room_callout.get(k) or room_post.get(k)), room=k, kind='callout' if k in room_callout else 'post' if k in room_post else 'other') for k in ch]
# C4 + C8 (files 54, 58): credentials
ch, gone, new, a, b = changed('select id, "actorId", type, "resourceID" from credential')
actor_type = {r[0]: r[1] for r in q(AFT, 'select id, type from actor')}
def cred(v): return {'actor': v[0], 'actorType': actor_type.get(v[0]), 'type': v[1], 'resource': v[2], 'url': space.get(v[2], {}).get('path')}
out['c4_removed_duplicates'] = [cred(a[k]) for k in gone]
out['c8_credentials_added'] = [cred(b[k]) for k in new]
out['c8_credentials_moved'] = [dict(cred(v[1]), was=v[0][2], wasUrl=space.get(v[0][2], {}).get('path')) for k, v in ch.items()]
ch, *_ = changed("""select r.id, r.credential->>'resourceID', md5(r."parentCredentials"::text), s.id from role r join community c on c."roleSetId"=r."roleSetId" join space s on s."communityId"=c.id""")
sp = collections.defaultdict(list)
for k, v in ch.items(): sp[v[1][2]].append(k)
out['c8_spaces'] = [{'space': s, 'url': space.get(s, {}).get('path'), 'level': space.get(s, {}).get('level'), 'roles': len(r)} for s, r in sp.items()]
# C7 (file 57)
ch, *_ = changed('select id, "nameID" from callout'); out['c7_callout_handle'] = [dict(where(k), was=v[0][0]) for k, v in ch.items()]
# B1 (file 60)
ch, *_ = changed("""select t.id, t.tags, coalesce(c.id::text,'') from tagset t left join callout c on c."classificationId"=t."classificationId" where t."classificationId" is not null""")
out['b1_phase_tags'] = [dict(where(v[1][1]), was=v[0][0], now=v[1][0]) for k, v in ch.items() if v[0][0] != v[1][0]]
# B2 (file 61)
ch, *_ = changed('select id, coalesce("parentSpaceId"::text,\'\') from space'); out['b2_space_pointer'] = [{'space': k, 'url': space.get(k, {}).get('path'), 'was': v[0][0]} for k, v in ch.items()]
ch, *_ = changed('select id, coalesce("parentStorageAggregatorId"::text,\'\') from storage_aggregator')
agg_space = {r[0]: r[1] for r in q(AFT, 'select "storageAggregatorId", id from space')}
out['b2_storage_parent'] = [{'aggregator': k, 'space': agg_space.get(k), 'url': space.get(agg_space.get(k), {}).get('path')} for k in ch]
ch, *_ = changed('select id, "nameID", type from actor'); out['b2_handles'] = [{'actor': k, 'type': v[1][1], 'was': v[0][0], 'now': v[1][0], 'url': space.get(k, {}).get('path')} for k, v in ch.items()]

json.dump(out, open(OUT, 'w'), indent=1)
print(f'=== 76 repaired entities: before {BEF}, after {AFT}')
for k, v in out.items():
    n = v['count'] if isinstance(v, dict) else len(v)
    extra = ''
    if isinstance(v, list) and v and 'visibility' in v[0]:
        extra = '  ' + str(dict(collections.Counter(('template' if x.get('isTemplate') else 'vc' if x.get('vc') else 'no space' if not x.get('url') else x.get('visibility')) for x in v)))
    if isinstance(v, list) and v and 'actorType' in v[0]: extra = '  holders: ' + str(dict(collections.Counter(x['actorType'] for x in v))) + f", distinct {len(set(x['actor'] for x in v))}"
    if isinstance(v, dict): extra = '  ' + str(v['pairs'])
    print(f'    {k:28} {n:5}{extra}')
