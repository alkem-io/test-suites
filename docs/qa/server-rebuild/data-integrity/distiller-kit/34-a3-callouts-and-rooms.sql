\echo ===== A3 EXTRA (acceptance backup 2026-11-11, local copy)
CREATE TEMP TABLE oc AS
SELECT c.*, o.rule, o.round,
       EXISTS (SELECT 1 FROM "user" u WHERE u.id=c."createdBy") AS live_author,
       cs.type::text AS set_type,
       col.id AS collab_id,
       (SELECT count(*) FROM space s WHERE s."collaborationId"=col.id) AS n_space,
       (SELECT count(*) FROM template_content_space t WHERE t."collaborationId"=col.id) AS n_tcs,
       (SELECT count(*) FROM template tp JOIN template_content_space t ON tp."contentSpaceId"=t.id WHERE t."collaborationId"=col.id) AS n_template
  FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text
  LEFT JOIN callouts_set cs ON cs.id=c."calloutsSetId"
  LEFT JOIN collaboration col ON col."calloutsSetId"=cs.id;
\echo --- E1 orphaned callouts by where they hang
SELECT rule, round, set_type, (collab_id IS NOT NULL) has_collab, n_space, n_tcs, n_template, "isTemplate" is_tpl, count(*) callouts, count(*) FILTER (WHERE live_author) by_live_author
  FROM oc GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 9 DESC;
\echo --- E2 callouts by live authors: framing type, visibility, age, text
SELECT f.type::text framing, oc.settings->>'visibility' visibility, count(*) n,
       min(oc."createdDate")::date first_created, max(oc."createdDate")::date last_created, max(greatest(oc."updatedDate", f."updatedDate", p."updatedDate"))::date last_touched,
       count(*) FILTER (WHERE length(coalesce(p.description,''))>0) with_text,
       round(avg(length(coalesce(p.description,''))) FILTER (WHERE length(coalesce(p.description,''))>0)) avg_len,
       max(length(coalesce(p.description,''))) max_len,
       count(f."whiteboardId") wb, count(f."memoId") memo, count(f."linkId") link, count(f."mediaGalleryId") media, count(f."pollId") poll, count(f."collaboraDocumentId") collabora
  FROM oc LEFT JOIN callout_framing f ON f.id=oc."framingId" LEFT JOIN profile p ON p.id=f."profileId"
 WHERE oc.live_author GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- E3 callouts by live authors per creation month
SELECT to_char(oc."createdDate",'YYYY-MM') AS mon, count(*) n, count(DISTINCT oc."calloutsSetId") callout_sets, count(DISTINCT oc."createdBy") authors FROM oc WHERE live_author GROUP BY 1 ORDER BY 1;
\echo --- E4 is the text a copy of something that survives (same title and same description on a non-orphaned callout)
WITH t AS (
  SELECT oc.id, p."displayName" dn, md5(coalesce(p.description,'')) dh, length(coalesce(p.description,'')) dl
    FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" WHERE oc.live_author),
live AS (
  SELECT p."displayName" dn, md5(coalesce(p.description,'')) dh
    FROM callout c JOIN callout_framing f ON f.id=c."framingId" JOIN profile p ON p.id=f."profileId"
   WHERE NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='callout' AND o.id=c.id::text))
SELECT count(*) callouts,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM live l WHERE l.dn=t.dn AND l.dh=t.dh)) same_title_and_text_survives,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM live l WHERE l.dn=t.dn AND l.dh=t.dh) AND EXISTS (SELECT 1 FROM live l WHERE l.dn=t.dn)) same_title_only_survives,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM live l WHERE l.dn=t.dn)) title_unique_to_orphans,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM live l WHERE l.dn=t.dn AND l.dh=t.dh) AND dl>0) unique_with_text,
       count(DISTINCT dn||dh) distinct_title_text_pairs
  FROM t;
\echo --- E4b the description text alone: does the same text survive on any non-orphaned callout, whatever the title
WITH t AS (
  SELECT oc.id, md5(p.description) dh, to_char(oc."createdDate",'YYYY-MM') mon
    FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" WHERE oc.live_author AND length(coalesce(p.description,''))>0),
live AS (
  SELECT DISTINCT md5(p.description) dh
    FROM callout c JOIN callout_framing f ON f.id=c."framingId" JOIN profile p ON p.id=f."profileId"
   WHERE length(coalesce(p.description,''))>0 AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='callout' AND o.id=c.id::text))
SELECT mon, count(*) with_text, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM live l WHERE l.dh=t.dh)) same_text_survives, count(DISTINCT dh) distinct_texts,
       count(DISTINCT dh) FILTER (WHERE NOT EXISTS (SELECT 1 FROM live l WHERE l.dh=t.dh)) distinct_texts_lost
  FROM t GROUP BY 1 ORDER BY 1;
\echo --- E4c callouts per orphaned callout set (shape of the sets created by live authors)
SELECT n AS callouts_in_set, count(*) sets FROM (SELECT "calloutsSetId", count(*) n FROM oc WHERE live_author GROUP BY 1) x GROUP BY 1 ORDER BY 1;
\echo --- E5 edited after creation (version above 1 or touched more than 5 minutes after creation)
SELECT count(*) FILTER (WHERE oc.version>1 OR f.version>1 OR p.version>1) version_above_1,
       count(*) FILTER (WHERE greatest(oc."updatedDate", f."updatedDate", p."updatedDate") > oc."createdDate" + interval '5 minutes') touched_later,
       count(*) total
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" WHERE oc.live_author;
\echo --- E6 per live author (no ids): callouts, sets, period, staff mail domain
SELECT row_number() OVER (ORDER BY count(*) DESC) author_no, count(*) callouts, count(DISTINCT oc."calloutsSetId") sets, min(oc."createdDate")::date first_, max(oc."createdDate")::date last_,
       bool_or(u.email ILIKE '%@alkem.io') staff_domain,
       (SELECT count(*) FROM credential cr WHERE cr."actorId"=u.id AND cr.type::text LIKE 'global-%') global_roles
  FROM oc JOIN "user" u ON u.id=oc."createdBy" WHERE oc.live_author GROUP BY u.id ORDER BY 2 DESC;
\echo --- E7 what hangs below the callouts by live authors
SELECT (SELECT count(*) FROM callout_contribution cc JOIN oc ON oc.id=cc."calloutId" WHERE oc.live_author) contributions_any_author,
       (SELECT count(*) FROM oc JOIN room r ON r.id=oc."commentsId" WHERE oc.live_author) comment_rooms,
       (SELECT coalesce(sum(r."messagesCount"),0) FROM oc JOIN room r ON r.id=oc."commentsId" WHERE oc.live_author) comment_messages,
       (SELECT count(*) FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" JOIN reference rf ON rf."profileId"=p.id WHERE oc.live_author) references_,
       (SELECT count(*) FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" JOIN visual v ON v."profileId"=p.id WHERE oc.live_author AND coalesce(v.uri,'')<>'') visuals_with_uri,
       (SELECT count(*) FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" JOIN file d ON d."storageBucketId"=p."storageBucketId" WHERE oc.live_author) documents_in_bucket;
\echo --- E8 framing whiteboards and memos: body size
SELECT 'whiteboard' kind, count(*) n, count(fl.id) with_body_file, min(fl.size) min_bytes, max(fl.size) max_bytes
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN whiteboard w ON w.id=f."whiteboardId" LEFT JOIN file fl ON fl.id::text=w."contentPointer"::text WHERE oc.live_author
UNION ALL
SELECT 'memo', count(*), count(fl.id), min(fl.size), max(fl.size)
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN memo m ON m.id=f."memoId" LEFT JOIN file fl ON fl.id::text=m."contentPointer"::text WHERE oc.live_author;
\echo --- E9 the A3 rooms: type, month created, messages
CREATE TEMP TABLE a3rooms AS
  SELECT 'callout.comments' owner, c."commentsId" rid FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text WHERE c."commentsId" IS NOT NULL
  UNION ALL SELECT 'communication.updates', m."updatesId" FROM communication m JOIN orphan o ON o.tbl='communication' AND o.id=m.id::text WHERE m."updatesId" IS NOT NULL;
SELECT x.owner, r.type::text AS rtype, to_char(r."createdDate",'YYYY-MM') AS mon, count(*) rooms, sum(r."messagesCount") msgs, count(*) FILTER (WHERE r."createdDate" < '2026-10-28') created_before_oct28
  FROM a3rooms x JOIN room r ON r.id=x.rid GROUP BY 1,2,3 ORDER BY 1,3;
\echo --- E9b all orphaned rooms in the reconstruction, by type
SELECT r.type::text AS rtype, count(*) rooms, sum(r."messagesCount") msgs, count(*) FILTER (WHERE r."createdDate" < '2026-10-28') created_before_oct28 FROM room r JOIN orphan o ON o.tbl='room' AND o.id=r.id::text GROUP BY 1 ORDER BY 2 DESC;
\echo ROOMIDS-BEGIN
\pset tuples_only on
\pset format unaligned
SELECT x.owner||','||x.rid||','||r."createdDate"::date FROM a3rooms x JOIN room r ON r.id=x.rid;
\echo ROOMIDS-END
\echo ALLORPHANROOMS-BEGIN
SELECT r.type::text||','||r.id||','||r."createdDate"::date FROM room r JOIN orphan o ON o.tbl='room' AND o.id=r.id::text;
\echo ALLORPHANROOMS-END
