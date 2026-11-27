\echo ===== A3 DRILL (acceptance backup 2026-11-11, local copy)
CREATE TEMP TABLE oc AS
SELECT c.*, EXISTS (SELECT 1 FROM "user" u WHERE u.id=c."createdBy") AS live_author
  FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text;
CREATE TEMP TABLE ot AS
SELECT oc.id, oc."calloutsSetId" sid, oc."isTemplate" tpl, p."displayName" dn, coalesce(p.description,'') d,
       regexp_replace(regexp_replace(regexp_replace(coalesce(p.description,''), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'U', 'g'), 'https?://[^ )"<]+', 'L', 'g'), '[0-9]+', 'N', 'g') dnorm
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" WHERE oc.live_author;
\echo --- D1 what the text is made of (template callouts of 2025-07 against the 3 of 2024-12)
SELECT tpl, count(*) n, count(*) FILTER (WHERE d<>'') with_text,
       count(*) FILTER (WHERE d ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') has_uuid,
       count(*) FILTER (WHERE d ~ 'https?://') has_link, count(*) FILTER (WHERE d ~ '[0-9]') has_digit, count(*) FILTER (WHERE d ~ '<[a-z]') has_html,
       count(DISTINCT d) FILTER (WHERE d<>'') distinct_texts, count(DISTINCT dnorm) FILTER (WHERE d<>'') distinct_after_masking_ids_links_numbers,
       count(DISTINCT dn) distinct_titles, count(DISTINCT regexp_replace(dn,'[0-9]+','N','g')) distinct_titles_masked
  FROM ot GROUP BY 1;
\echo --- D2 after masking ids, links and numbers: does the text survive on a non-orphaned callout
WITH live AS (
  SELECT DISTINCT regexp_replace(regexp_replace(regexp_replace(coalesce(p.description,''), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'U', 'g'), 'https?://[^ )"<]+', 'L', 'g'), '[0-9]+', 'N', 'g') dnorm
    FROM callout c JOIN callout_framing f ON f.id=c."framingId" JOIN profile p ON p.id=f."profileId"
   WHERE coalesce(p.description,'')<>'' AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='callout' AND o.id=c.id::text))
SELECT tpl, count(*) with_text, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM live l WHERE l.dnorm=ot.dnorm)) masked_text_survives FROM ot WHERE d<>'' GROUP BY 1;
\echo --- D3 pattern of the masked texts (length and count only)
SELECT length(dnorm) len, count(*) n, count(DISTINCT sid) sets FROM ot WHERE d<>'' AND tpl GROUP BY dnorm ORDER BY 2 DESC LIMIT 12;
\echo --- D4 title pattern per set position: same titles in every set
SELECT titles_in_set, count(*) sets FROM (SELECT sid, count(DISTINCT dn) titles_in_set FROM ot WHERE tpl GROUP BY 1) x GROUP BY 1 ORDER BY 1;
SELECT count(DISTINCT dn) distinct_titles_overall, count(*) FILTER (WHERE dn ~* 'test|e2e|qa|lorem') titles_naming_a_test, count(*) FILTER (WHERE d ~* 'test|e2e|lorem') texts_naming_a_test, count(*) total FROM ot WHERE tpl;
\echo --- D5 the files in the storage buckets of these callout framings
SELECT fl."mimeType", count(*) files, count(DISTINCT fl."storageBucketId") buckets, pg_size_pretty(sum(fl.size)::bigint) total, min(fl.size) min_b, max(fl.size) max_b,
       min(fl."createdDate")::date first_, max(fl."createdDate")::date last_,
       count(*) FILTER (WHERE fl."createdBy" IS NOT NULL) with_creator,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=fl.id::text)) classed_orphan,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"::text=fl.id::text)) is_whiteboard_body,
       count(*) FILTER (WHERE fl."authorizationId" IS NULL) no_policy
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" JOIN file fl ON fl."storageBucketId"=p."storageBucketId"
 WHERE oc.live_author GROUP BY 1 ORDER BY 2 DESC;
\echo --- D5b same files: is the bucket shared with anything that survives
SELECT count(DISTINCT p."storageBucketId") buckets,
       count(DISTINCT p."storageBucketId") FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='storage_bucket' AND o.id=p."storageBucketId"::text)) buckets_classed_orphan,
       count(DISTINCT p."storageBucketId") FILTER (WHERE (SELECT count(*) FROM profile p2 WHERE p2."storageBucketId"=p."storageBucketId")>1) buckets_shared_by_profiles
  FROM oc JOIN callout_framing f ON f.id=oc."framingId" JOIN profile p ON p.id=f."profileId" WHERE oc.live_author;
\echo --- D6 the template content spaces above the 88 template callouts
SELECT count(DISTINCT t.id) content_spaces, count(DISTINCT t.id) FILTER (WHERE t."parentSpaceId" IS NULL) top_level, min(t."createdDate")::date first_, max(t."createdDate")::date last_,
       count(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM template tp WHERE tp."contentSpaceId"=t.id)) referenced_by_a_template,
       count(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM template_content_space t2 WHERE t2.id=t."parentSpaceId")) parent_content_space_exists
  FROM oc JOIN collaboration col ON col."calloutsSetId"=oc."calloutsSetId" JOIN template_content_space t ON t."collaborationId"=col.id WHERE oc.live_author;
