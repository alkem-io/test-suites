# 📋 QA Strategic Plan 2026

> **Owner:** Como (QA Lead)
> **Created:** February 12, 2026
> **Last Updated:** February 12, 2026
> **Status:** 🟡 In Progress

---

## ✅ Quick Progress Summary

### Q1 2026 Goals

- [ ] Nightly builds running reliably (>80% success rate)
- [ ] Virtual Contributor test coverage added
- [ ] Test reporting dashboard live
- [ ] QA Agent MVP operational

### Monthly Milestones

**February 2026:**

- [ ] Fix nightly builds (P0 complete)
- [ ] Environment stability verified

**March 2026:**

- [ ] Virtual Contributor tests complete
- [ ] Dashboard deployed
- [ ] QA Agent design finalized

**April 2026:**

- [ ] QA Agent Phase 1 complete
- [ ] Admin features coverage added
- [ ] Search tests implemented

---

## Executive Summary

This strategic plan addresses quality assurance for the Alkemio platform at a critical juncture. With 5 years of development, the organization faces high stakes while operating with lean QA resources. This plan establishes priorities, identifies coverage gaps, and outlines a path toward sustainable quality practices including AI-assisted test automation.

---

## 📊 Current State Analysis

### Test Inventory Summary

| Repository                 | Test Type                             | Count | Status    |
| -------------------------- | ------------------------------------- | ----- | --------- |
| **test-suites/server-api** | API Integration Tests (`.it-spec.ts`) | ~137  | ✅ Active |
| **test-suites/client-web** | E2E Playwright Tests (`.spec.ts`)     | ~74   | ✅ Active |
| **test-suites/lib**        | Shared Test Utilities                 | -     | ✅ Active |

### API Test Coverage by Domain (server-api)

| Domain                   | Tests | Coverage Level |
| ------------------------ | ----- | -------------- |
| Journey (Space/Subspace) | 15+   | 🟢 Good        |
| Roleset/Permissions      | 12+   | 🟢 Good        |
| Notifications            | 20+   | 🟢 Good        |
| Storage/Auth             | 10+   | 🟡 Moderate    |
| Contributor Management   | 10+   | 🟡 Moderate    |
| Callouts                 | 5+    | 🟡 Moderate    |
| Entitlements             | 6+    | 🟡 Moderate    |
| Communications           | 5+    | 🟡 Moderate    |
| Templates                | 3+    | 🔴 Limited     |
| Search                   | 1     | 🔴 Limited     |
| Subscriptions            | 3+    | 🔴 Limited     |
| Activity Logs            | 3     | 🔴 Limited     |

### E2E Test Coverage by Feature (client-web)

| Feature Area         | Tests | Coverage Level |
| -------------------- | ----- | -------------- |
| Authentication       | 8     | 🟢 Good        |
| Memberships          | 20+   | 🟢 Good        |
| Callouts             | 9     | 🟢 Good        |
| Public Space         | 6     | 🟡 Moderate    |
| Applications         | 2     | 🟡 Moderate    |
| Templates            | 4     | 🟡 Moderate    |
| User Profile         | 4     | 🟡 Moderate    |
| Space Creation       | 2     | 🔴 Limited     |
| Support Navigation   | 2     | 🔴 Limited     |
| Explore Platform     | 2     | 🔴 Limited     |
| Innovation Pack      | 0     | 🔴 None        |
| Virtual Contributors | 0     | 🔴 None        |
| Admin Features       | 0     | 🔴 None        |

### Nightly Build Status

| Pipeline    | Platform       | Status                 | Issue                                       |
| ----------- | -------------- | ---------------------- | ------------------------------------------- |
| API Nightly | Travis CI      | ⚠️ Needs Investigation | Node.js version compatibility               |
| E2E Nightly | GitHub Actions | ⚠️ Not Running         | Workflow dispatch only, no schedule trigger |

---

## 🚨 Critical Gaps Identified

### Priority 1: Infrastructure Issues

- [ ] **Nightly builds not running automatically** - Missing cron schedule in GitHub Actions
- [ ] **Travis CI compatibility issues** - Node.js version conflicts (17.9.1 vs 20.x)
- [ ] **No test result aggregation** - Reports generated but not centralized

### Priority 2: Coverage Gaps

- [ ] **Virtual Contributors** - Zero UI coverage for a key feature
- [ ] **Innovation Packs** - Limited API coverage, zero UI coverage
- [ ] **Admin/Platform management** - No coverage
- [ ] **Search functionality** - Single API test, no UI coverage
- [ ] **Non-functional testing** - No performance, load, or security tests

### Priority 3: Process Gaps

- [ ] **No centralized test tracking/dashboard**
- [ ] **Manual PR test coordination**
- [ ] **Limited documentation of test scenarios**
- [ ] **No formal test plan governance**

---

## 🎯 Progress Tracker

### 🔴 P0 - Critical (Week 1-2)

- [ ] **Task 1:** Fix GitHub Actions nightly schedule (1 day)
  - [ ] Add cron schedule to workflow file
  - [ ] Test workflow manually first
  - [ ] Verify scheduled run triggers

- [ ] **Task 2:** Diagnose/fix Travis CI API nightly (2 days)
  - [ ] Check Node.js version compatibility
  - [ ] Verify branch configuration
  - [ ] Update secrets if needed
  - [ ] Run test build

- [ ] **Task 3:** Ensure test environment stability (2 days)
  - [ ] Document environment setup
  - [ ] Add health check endpoints
  - [ ] Verify test data consistency

### 🟠 P1 - High (Week 3-6)

- [ ] **Task 4:** Add test coverage for Virtual Contributors (API) (3 days)
  - [ ] Create VC CRUD tests
  - [ ] Add AI persona engine tests
  - [ ] Test knowledge base access
  - [ ] Test interaction modes

- [ ] **Task 5:** Add test coverage for Virtual Contributors (E2E) (3 days)
  - [ ] Create VC creation flow tests
  - [ ] Test VC configuration UI
  - [ ] Test VC interaction in space
  - [ ] Test VC visibility settings

- [ ] **Task 6:** Expand Innovation Pack API tests (2 days)
  - [ ] Add template creation tests
  - [ ] Test pack visibility settings
  - [ ] Test pack sharing/transfer

- [ ] **Task 7:** Set up test reporting dashboard (3 days)
  - [ ] Design dashboard layout
  - [ ] Implement data aggregation
  - [ ] Deploy to GitHub Pages
  - [ ] Add notification integration

### 🟡 P2 - Medium (Week 7-12)

- [ ] **Task 8:** QA Agent MVP design & implementation (2 weeks)
  - [ ] Define agent architecture
  - [ ] Set up GitHub webhook/action
  - [ ] Integrate LLM for analysis
  - [ ] Build test coverage index
  - [ ] Create test plan templates
  - [ ] Test with sample PRs
  - [ ] Document usage guide

- [ ] **Task 9:** Add Admin features E2E coverage (1 week)
  - [ ] Platform admin tests
  - [ ] User management tests
  - [ ] Organization admin tests
  - [ ] Settings configuration tests

- [ ] **Task 10:** Search functionality tests (API + E2E) (1 week)
  - [ ] API search query tests
  - [ ] Search filtering tests
  - [ ] UI search experience tests
  - [ ] Search results accuracy tests

- [ ] **Task 11:** Document test coverage map (3 days)
  - [ ] Map features to test files
  - [ ] Identify coverage gaps
  - [ ] Create visual coverage report

### 🟢 P3 - Lower (Quarter 2)

- [ ] **Task 12:** Performance baseline tests (1 week)
  - [ ] Define performance KPIs
  - [ ] Set up load testing tool
  - [ ] Create baseline test suite
  - [ ] Document performance thresholds

- [ ] **Task 13:** Security scanning integration (1 week)
  - [ ] Evaluate security scanning tools
  - [ ] Integrate with CI pipeline
  - [ ] Configure vulnerability alerts
  - [ ] Create remediation workflow

- [ ] **Task 14:** Expand template tests (1 week)
  - [ ] Whiteboard template tests
  - [ ] Post template tests
  - [ ] Callout template tests
  - [ ] Space template tests

- [ ] **Task 15:** API contract testing setup (1 week)
  - [ ] Set up schema validation
  - [ ] Configure breaking change detection
  - [ ] Integrate with CI pipeline
  - [ ] Create deprecation tracking

---

## 🔧 Nightly Build Fix Plan

### GitHub Actions (E2E Tests)

**Issue:** Workflow only triggers on `workflow_dispatch` (manual)

**Fix Required:**

```yaml
# Add to .github/workflows/nightly-client-tests.yml
on:
  workflow_dispatch:
  schedule:
    - cron: "0 2 * * *" # Run at 2 AM UTC daily
```

**Checklist:**

- [ ] Add cron schedule to workflow
- [ ] Verify environment variables in GitHub Secrets
- [ ] Confirm test environment accessibility
- [ ] Add status badge to README
- [ ] Verify first scheduled run succeeds

### Travis CI (API Tests)

**Issues Identified:**

- [ ] Node.js version mismatch (17.9.1 required vs 20.x available)
- [ ] Secure env var configuration may be stale
- [ ] Branch matching disabled (`__disable_travis_never_build__`)

**Checklist:**

- [ ] Update `.travis.yml` branch configuration
- [ ] Test Node.js 20.x compatibility
- [ ] Verify Travis CI secrets are current
- [ ] Run manual build to validate
- [ ] Consider migration to GitHub Actions

---

## 🤖 QA Agent Implementation Plan

### Phase 1: PR Monitoring & Test Plan Generation (Weeks 8-10)

**Capabilities to Implement:**

- [ ] Monitor GitHub PRs marked "Ready for Review"
- [ ] Analyze PR diff against existing test coverage
- [ ] Generate test plan proposals in markdown
- [ ] Post test plan as PR comment for review

**Checklist:**

- [ ] Define agent architecture
- [ ] Create GitHub webhook/action trigger
- [ ] Integrate LLM for test plan generation
- [ ] Build test coverage database/index
- [ ] Create test plan template
- [ ] Test with sample PRs
- [ ] Document agent usage

### Phase 2: Test Implementation Assistance (Weeks 11-14)

**Checklist:**

- [ ] Extend agent for code generation
- [ ] Integrate TestScenarioFactory patterns
- [ ] Create PR creation workflow
- [ ] Define human review process
- [ ] Test with real features
- [ ] Gather feedback and iterate

### Phase 3: Continuous Learning (Quarter 2+)

**Checklist:**

- [ ] Implement feedback loop from test failures
- [ ] Build pattern recognition for bug types
- [ ] Create coverage gap detection
- [ ] Add risk-based test recommendations

---

## 📊 Test Management & Reporting

### GitHub Pages Dashboard Setup

**Checklist:**

- [ ] Design dashboard layout
- [ ] Add JSON summary export to Playwright
- [ ] Add JSON summary export to Jest
- [ ] Create trend visualization component
- [ ] Deploy enhanced index.html
- [ ] Configure notification webhooks
- [ ] Document dashboard usage

### Proposed Structure

```
playwright-reports.github.io/
├── index.html              # Main dashboard
├── playwright/             # E2E test history
│   ├── index.html          # E2E trends
│   └── YYYY-MM-DD/
├── api/                    # API test history
│   ├── index.html          # API trends
│   └── YYYY-MM-DD/
└── coverage/               # Coverage reports
    └── index.html          # Coverage trends
```

---

## 📅 Weekly Progress Log

### Week of Feb 10, 2026

- [ ] Started strategic plan documentation
- [ ] Analyzed current test inventory
- [ ] Identified critical gaps

### Week of Feb 17, 2026

- [ ] _Add progress notes here_

### Week of Feb 24, 2026

- [ ] _Add progress notes here_

### Week of Mar 3, 2026

- [ ] _Add progress notes here_

### Week of Mar 10, 2026

- [ ] _Add progress notes here_

### Week of Mar 17, 2026

- [ ] _Add progress notes here_

### Week of Mar 24, 2026

- [ ] _Add progress notes here_

### Week of Mar 31, 2026

- [ ] _Add progress notes here_

---

## 📈 Metrics Dashboard

### Weekly Update Checklist

- [ ] Update nightly build success rate
- [ ] Update test counts (API & E2E)
- [ ] Log test run results
- [ ] Note any significant failures
- [ ] Update coverage percentage

### Current Metrics (Update Weekly)

| Metric                     | Baseline | Current | Target Q1 | Target Q2 |
| -------------------------- | -------- | ------- | --------- | --------- |
| Nightly build success rate | 0%       | \_\_%   | 80%       | 95%       |
| API test count             | 137      | \_\_    | 160       | 180       |
| E2E test count             | 74       | \_\_    | 95        | 120       |
| Critical path coverage     | ~60%     | \_\_%   | 80%       | 95%       |
| PR test plan automation    | 0%       | \_\_%   | 50%       | 80%       |
| Test result visibility     | Manual   | \_\_    | Dashboard | Analytics |

### Test Run History

| Date   | API Pass | API Fail | E2E Pass | E2E Fail | Notes   |
| ------ | -------- | -------- | -------- | -------- | ------- |
| _Date_ | \_\_     | \_\_     | \_\_     | \_\_     | _Notes_ |

---

## 🛡️ Risk Register

### Open Risks

- [ ] **Environment instability** (Likelihood: Medium, Impact: High)
  - Mitigation: Document setup, add health checks

- [ ] **Agent generates poor tests** (Likelihood: Medium, Impact: Medium)
  - Mitigation: Human review gate, feedback loop

- [ ] **Coverage gaps in critical areas** (Likelihood: High, Impact: High)
  - Mitigation: Priority-based approach
  - Status: 🔄 Monitoring

- [ ] **Single point of failure (solo QA)** (Likelihood: High, Impact: High)
  - Mitigation: Agent assistance, dev enablement
  - Status: 🔄 Monitoring

- [ ] **Technical debt in test code** (Likelihood: Medium, Impact: Medium)
  - Mitigation: Regular cleanup sprints

---

## 📝 Decision Log

- [x] **Feb 12, 2026:** Created strategic plan
  - Rationale: Need structured approach for QA improvements
  - Outcome: Document created

- [ ] **_Date_:** _Decision description_
  - Rationale: _Why this decision was made_
  - Outcome: _Result_

---

## 🔗 Related Documents

- [ ] Review [Test Scenario Factory Capabilities](../lib/docs/test-scenario-factory-capabilities.md)
- [ ] Review [Constitution](../.specify/memory/constitution.md)
- [ ] Review [Nightly Workflow](./.github/workflows/nightly-client-tests.yml)
- [ ] Review [Travis CI Config](../.travis.yml)

---

## 📞 Stakeholder Communication

### Communication Checklist

- [ ] Send monthly QA update (end of each month)
- [ ] Share dashboard link with stakeholders
- [ ] Present quarterly review to leadership
- [ ] Document and share blockers promptly

### Monthly Update Template

```markdown
## QA Monthly Update - [Month Year]

### Highlights

-

### Metrics

- Nightly success rate: \_\_%
- Test count: API **, E2E **
- Critical bugs caught: \_\_

### Completed This Month

-

### Planned Next Month

-

### Blockers/Risks

-

### Requests

-
```

---

_Last reviewed: February 12, 2026_
_Next review: February 28, 2026_
