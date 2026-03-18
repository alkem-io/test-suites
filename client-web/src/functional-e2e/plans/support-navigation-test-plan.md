# Support Navigation Test Plan

Scope: Only the flows covered by the current automated tests.

## Scenarios

### 1. Support Dialog

#### 1.1 Open Support Dialog

- From dashboard (`/home`), click footer "Support".
- Expect dialog with heading "Looking for help?" and option "Explore Documentation"; close button visible.

#### 1.2 Navigate to Documentation from Support Dialog

- With dialog open, click "Explore Documentation".
- Expect new tab to `/docs` with heading "Documentation" and embedded docs iframe.

#### 1.3 Close Support Dialog

- With dialog open, click Close (X).
- Expect dialog closes; dashboard remains visible (welcome heading).

### 2. Documentation Navigation

#### 2.1 Direct Documentation Access

- Navigate to `${baseUrl}/docs`.
- Expect heading "Documentation" and docs iframe visible.

#### 2.3 Navigate Back to Dashboard from Documentation

- From `/docs`, use "My Dashboard" to return.
- Expect navigation to `/home` and dashboard welcome heading.

### 3. Inviting Documentation Flow

#### 3.1 Complete Inviting Flow with Embedded Tutorial

- From dashboard, open Support dialog; click "Explore Documentation" (new tab).
- In docs iframe, click "Inviting People to a Space" (URL `/docs/how-to/inviting`).
- In embedded invite tutorial iframe, click "Get started".
- Return to dashboard via original page (`/home`) and verify welcome heading.

## Notes

- Multi-tab handling: docs open in a new tab; ensure correct page targeting.
- Iframe handling: use frame locators for documentation and nested tutorial iframe.
