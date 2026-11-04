\pset footer off
SELECT 'whiteboard content first char: '||left(content,1) AS chk, count(*) FROM whiteboard WHERE content<>'' GROUP BY 1
UNION ALL SELECT 'tagset allowedValues violated by tagset name: '||t.name, count(*) FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" WHERE tt."allowedValues" IS NOT NULL AND tt."allowedValues"<>'' AND t.tags<>'' AND EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags,',')) x WHERE x<>'' AND NOT (','||tt."allowedValues"||',' LIKE '%,'||x||',%')) GROUP BY t.name
UNION ALL SELECT 'flow-state tagset tag not in template allowedValues AND callout in real space', count(*) FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space s ON s."collaborationId"=col.id WHERE t.name='flow-state' AND tt."allowedValues"<>'' AND t.tags<>'' AND NOT (','||tt."allowedValues"||',' LIKE '%,'||t.tags||',%')
UNION ALL SELECT 'space zero admins+leads by level '||level, count(*) FROM space s WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text) GROUP BY level
UNION ALL SELECT 'L0 zero admins+leads AND host not member', count(*) FROM space s WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text)
UNION ALL SELECT 'template_content_space with parent', count(*) FROM template_content_space WHERE "parentSpaceId" IS NOT NULL
UNION ALL SELECT 'template_content_space by level '||level, count(*) FROM template_content_space GROUP BY level
UNION ALL SELECT 'callout sets with duplicate sortOrder', count(DISTINCT "calloutsSetId") FROM (SELECT "calloutsSetId","sortOrder" FROM callout WHERE "calloutsSetId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'callout duplicate sortOrder where sortOrder=0', count(*) FROM (SELECT "calloutsSetId","sortOrder" FROM callout WHERE "calloutsSetId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d WHERE "sortOrder"=0
UNION ALL SELECT 'callout published without publishedDate by year '||extract(year FROM "createdDate"), count(*) FROM callout WHERE settings->>'visibility'='published' AND "publishedDate" IS NULL GROUP BY 1

UNION ALL SELECT 'vc listedInStore by visibility '||"searchVisibility"::text, count(*) FROM virtual_contributor WHERE "listedInStore"=true GROUP BY 1
UNION ALL SELECT 'file externalID shared by N rows: max', max(c) FROM (SELECT count(*) c FROM file WHERE "externalID"<>'' GROUP BY "externalID") d
UNION ALL SELECT 'org lead count > max: spaces', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='lead' WHERE ("organizationPolicy"->>'maximum')::int>=0 AND (SELECT count(*) FROM credential cr JOIN actor a ON a.id=cr."actorId" AND a.type='organization' WHERE cr.type='space-lead' AND cr."resourceID"=s.id::text)>("organizationPolicy"->>'maximum')::int;
\echo ===N platform wellKnown VC missing + L0 zero members
SELECT e.key, e.value FROM platform p, jsonb_each_text(p."wellKnownVirtualContributors") e WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=e.value);
SELECT a."nameID", s.visibility, a."createdDate"::date FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='space-member' AND c."resourceID"=s.id::text) ORDER BY 3;
