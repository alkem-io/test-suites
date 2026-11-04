# Regenerating the catalogue

Three steps, all offline except the schema download.

```bash
# 1. the legacy surface: the server's committed schema on develop
gh api -H 'Accept: application/vnd.github.raw' 'repos/alkem-io/server/contents/schema.graphql?ref=develop' > /tmp/schema.graphql
python3 -I docs/qa/server-rebuild/catalogue/_tools/extract-root-fields.py /tmp/schema.graphql /tmp/root-fields.tsv

# 2. the usage trace, from the test-suites repo root at the revision under study
python3 -I docs/qa/server-rebuild/catalogue/_tools/trace-usage.py /tmp/root-fields.tsv /tmp/usage.json

# 3. the catalogue and the appendix
python3 -I docs/qa/server-rebuild/catalogue/_tools/gen-catalogue.py /tmp/usage.json docs/qa/server-rebuild/catalogue
```

Update `SHA_SCHEMA` and `SHA_TS` in `gen-catalogue.py`, and place any field the run reports as "not assigned" by extending a feature's regex. The feature rows (journeys, specs, landing, slice, verdict, action) are hand-maintained in the same file; the evidence columns are computed.

How the trace works: a root field is "named" by a file when its name appears as a word in that file or in a `.graphql` document the file's operation calls. Spec files inherit what their imported helpers name, following relative and `@functional-api`/`@src` imports but never the lib (`*_strict`), or also through the lib (`*` without suffix). The catalogue uses the strict view, the appendix shows it too.
