-- 129-space-content-compare.sql: what a space shows, as one digest per item, to compare two databases (2026-11-20).
-- Asked by the QA lead after feedback of an acceptance user: "is this from the distiller or was it like this".
-- Run on the ORIGINAL kept database and on the live one, then diff the two outputs. Read-only, no temp tables.
-- Prints for the space and every subspace below: the profile, its visuals, every callout with its framing and
-- every contribution. Text is shown as length + md5, never as text. usage: psql -v names="'a','b'" -f this
\pset format unaligned
\pset tuples_only on
\pset fieldsep ' | '
WITH sp AS (
  SELECT s.id, s.level, a."nameID" nid, s."aboutId", s."collaborationId", s.visibility
    FROM space s JOIN actor a ON a.id=s.id
   WHERE s."levelZeroSpaceID" IN (SELECT s0.id FROM space s0 JOIN actor a0 ON a0.id=s0.id WHERE a0."nameID" IN (:names))),
d AS (SELECT p.id, length(coalesce(p.description,'')) len, md5(coalesce(p.description,'')) h, p."displayName" dn, p."updatedDate"::date upd FROM profile p)
SELECT * FROM (
SELECT sp.nid k1, '1 space' k2, '' k3, format('level %s visibility %s name %s tagline_len %s desc_len %s desc_md5 %s why_len %s who_len %s', sp.level, sp.visibility, md5(p."displayName"), length(coalesce(p.tagline,'')), length(coalesce(p.description,'')), md5(coalesce(p.description,'')), length(coalesce(sa.why,'')), length(coalesce(sa.who,''))) v
  FROM sp JOIN space_about sa ON sa.id=sp."aboutId" JOIN profile p ON p.id=sa."profileId"
UNION ALL
SELECT sp.nid, '2 visual', v.name::text, format('uri_len %s uri_md5 %s updated %s file_row %s', length(coalesce(v.uri,'')), md5(coalesce(v.uri,'')), v."updatedDate"::date,
       (SELECT count(*) FROM file f WHERE v.uri LIKE '%'||f.id::text))
  FROM sp JOIN space_about sa ON sa.id=sp."aboutId" JOIN visual v ON v."profileId"=sa."profileId"
UNION ALL
SELECT sp.nid, '3 callout', c."nameID", format('type %s sort %s template %s visibility %s title %s desc_len %s desc_md5 %s updated %s contributions %s', cf.type, c."sortOrder", c."isTemplate", c.settings->>'visibility', md5(d.dn), d.len, d.h, d.upd,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id))
  FROM sp JOIN collaboration co ON co.id=sp."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_framing cf ON cf.id=c."framingId" JOIN d ON d.id=cf."profileId"
UNION ALL
SELECT sp.nid, '4 post', c."nameID"||'/'||po."nameID", format('title %s desc_len %s desc_md5 %s updated %s', md5(d.dn), d.len, d.h, d.upd)
  FROM sp JOIN collaboration co ON co.id=sp."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_contribution cc ON cc."calloutId"=c.id JOIN post po ON po.id=cc."postId" JOIN d ON d.id=po."profileId"
UNION ALL
SELECT sp.nid, '5 other contribution', c."nameID", format('type %s count %s', cc.type, count(*))
  FROM sp JOIN collaboration co ON co.id=sp."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_contribution cc ON cc."calloutId"=c.id WHERE cc."postId" IS NULL GROUP BY 1,2,3,cc.type
) x ORDER BY 1,2,3,4;
