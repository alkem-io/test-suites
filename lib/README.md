# tests-lib

Library for creating test suites to provide quality assurance for the Alkemio platform.

## Regenerating the GraphQL types

`src/core/generated/{alkemio-schema,graphql}.ts` are committed artifacts. Regenerate
them whenever a spec needs a field the committed types do not have yet:

```bash
pnpm --filter @alkemio/tests-lib run codegen   # then: pnpm --filter @alkemio/tests-lib run build
```

By default codegen introspects the local server at
`http://localhost:3000/api/private/non-interactive/graphql`. Set `CODEGEN_SCHEMA`
to point it somewhere else, for example a server checkout's committed schema
file when no server is running:

```bash
CODEGEN_SCHEMA=../../server/schema.graphql pnpm --filter @alkemio/tests-lib run codegen
```

Regenerate against the server version the suites will run against; a newer
server only adds types, but an older one can drop fields other specs use.
