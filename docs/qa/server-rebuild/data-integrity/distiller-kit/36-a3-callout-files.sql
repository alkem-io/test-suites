\echo ===== A3 FILES (acceptance backup 2026-11-11, local copy)
CREATE TEMP TABLE of_ AS
SELECT DISTINCT fl.id, fl."externalID" ext, fl."mimeType" mt, fl.size, fl."createdBy" cb, fl."createdDate" cd
  FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text
  JOIN callout_framing f ON f.id=c."framingId" JOIN profile p ON p.id=f."profileId" JOIN file fl ON fl."storageBucketId"=p."storageBucketId"
 WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=c."createdBy");
\echo --- F1 blobs behind the 84 files: distinct blobs, and blobs that a surviving file row also points at
SELECT mt, count(*) files, count(DISTINCT ext) distinct_blobs,
       count(DISTINCT ext) FILTER (WHERE EXISTS (SELECT 1 FROM file x WHERE x."externalID"=of_.ext AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=x.id::text))) blobs_also_used_by_a_surviving_file,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file x WHERE x."externalID"=of_.ext AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=x.id::text))) files_on_a_shared_blob,
       count(DISTINCT cb) creators, count(*) FILTER (WHERE cb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=cb)) creator_gone
  FROM of_ GROUP BY 1;
\echo --- F2 how many surviving file rows point at those shared blobs
SELECT count(*) surviving_file_rows, count(DISTINCT x."externalID") blobs FROM file x
 WHERE x."externalID" IN (SELECT ext FROM of_) AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=x.id::text);
\echo --- F3 all orphaned file rows in the reconstruction: blobs shared with a surviving file row
SELECT count(*) orphaned_files, count(DISTINCT fl."externalID") distinct_blobs,
       count(DISTINCT fl."externalID") FILTER (WHERE EXISTS (SELECT 1 FROM file x WHERE x."externalID"=fl."externalID" AND NOT EXISTS (SELECT 1 FROM orphan o2 WHERE o2.tbl='file' AND o2.id=x.id::text))) blobs_also_used_by_a_surviving_file,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file x WHERE x."externalID"=fl."externalID" AND NOT EXISTS (SELECT 1 FROM orphan o2 WHERE o2.tbl='file' AND o2.id=x.id::text))) orphaned_files_on_a_shared_blob
  FROM file fl JOIN orphan o ON o.tbl='file' AND o.id=fl.id::text;
\echo --- F4 the 3 callouts touched later than 5 minutes after creation
SELECT c."isTemplate" tpl, to_char(c."createdDate",'YYYY-MM') made, to_char(greatest(c."updatedDate", f."updatedDate", p."updatedDate"),'YYYY-MM') touched, c.version cv, f.version fv, p.version pv, count(*)
  FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text JOIN callout_framing f ON f.id=c."framingId" JOIN profile p ON p.id=f."profileId"
 WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=c."createdBy") AND greatest(c."updatedDate", f."updatedDate", p."updatedDate") > c."createdDate" + interval '5 minutes' GROUP BY 1,2,3,4,5,6;
