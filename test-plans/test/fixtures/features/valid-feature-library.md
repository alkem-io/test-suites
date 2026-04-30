---
feature: Fixture Feature
slug: fixture-feature
---

## TC-9001 — Case with complete metadata and cross-repo links

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: qa-fixture
links:
  stories: [alkem-io/product#1234]
  bugs:    [alkem-io/server#4567]
  prs:     [alkem-io/client-web#99]
```

### Steps

1. Do the first thing.
2. Do the second thing.

### Expected

- The expected outcome happens within 2 seconds.
- A side effect is observable in the log.

## TC-9002 — Minimal case without links

```yaml
priority: P2
type: functional
state: Draft
should_automate: no
```

### Steps

1. Trigger a minimal flow.

### Expected

- Flow completes without error.
