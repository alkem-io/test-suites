# Contract: `@testCase` In-Code Tag Format

Normative grammar and placement rules for the `@testCase` tag used by automated tests to declare which business scenarios they cover.

## Placement

The tag MUST appear inside a comment (single-line `//` or block `/* */` or JSDoc `/** */`) that **immediately precedes** a `describe(`, `it(`, or `test(` call. "Immediately precedes" means no non-whitespace lines between the closing of the comment and the opening of the call.

A test file MAY contain multiple tags covering different `describe`/`it`/`test` blocks.

## Grammar (EBNF)

```
tagDirective    ::= "@testCase" whitespace idList
idList          ::= id (separator id)*
separator       ::= "," whitespace? | whitespace
id              ::= "TC-" digit+
digit           ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
whitespace      ::= " " | "\t"
```

## Semantics

- Every `describe(`, `it(`, or `test(` block in `server-api/src/functional-api/**/*.it-spec.ts` and `client-web/src/functional-e2e/**/*.spec.ts` SHOULD be preceded by a `@testCase` tag. Any matching block without a preceding tag is reported as an **orphan-automation** coverage defect.
- A tag referencing multiple IDs declares that the block verifies all of them. The block's outcome is applied to each referenced case for the current release.
- A tag MAY reference an ID that does not exist in any feature library; this is reported as an **unknown-case-ref** coverage defect. The test still runs; only the linkage is flagged.
- A `@testCase` tag on an outer `describe` is inherited by all contained `it`/`test` blocks that do not override it with their own tag.

## Examples

**Single case** (preferred when a block verifies one scenario):

```ts
// @testCase TC-0001
describe('Conversation subscriptions', () => {
  it('delivers a message to the subscriber', async () => { /* ... */ });
});
```

**Multiple cases** (one block verifies multiple business scenarios):

```ts
/**
 * @testCase TC-0001, TC-0002
 */
it('both creates a subscription and delivers the first message', async () => { /* ... */ });
```

**Whitespace-separated** (equivalent to comma-separated):

```ts
// @testCase TC-0001 TC-0002
it('…', async () => { /* ... */ });
```

**Inheritance** (outer describe applies to all inner tests unless overridden):

```ts
// @testCase TC-0100
describe('Space conversion', () => {
  it('moves an L1 space to L0', async () => { /* ... */ });        // inherits TC-0100

  // @testCase TC-0101
  it('preserves members after move', async () => { /* ... */ });    // overrides to TC-0101
});
```

## Non-normative rendering

The CLI SHOULD render the tag source (file path, line number) in the dashboard's per-case view so a reader can click through to the authoritative test code.
