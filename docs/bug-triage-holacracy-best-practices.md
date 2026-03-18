# 🐛 Bug Triage Process in Holacracy Organizations

> **Best Practices Guide for Self-Organizing Teams**

---

## 📑 Table of Contents

- [Overview](#overview)
- [Standard Bug Triage Process](#standard-bug-triage-process)
- [Holacracy Fundamentals](#holacracy-fundamentals)
- [Bug Triage in Holacracy](#bug-triage-in-holacracy)
- [Prioritization Framework](#prioritization-framework)
- [Circle Structure for QA](#circle-structure-for-qa)
- [Meeting Formats](#meeting-formats)
- [Key Principles](#key-principles)
- [References](#references)

---

## 📋 Overview

This document outlines best practices for implementing bug triage processes within organizations using Holacracy governance. It combines industry-standard bug management practices with the unique structural elements of self-organizing teams.

---

## 🔄 Standard Bug Triage Process

Bug triage is the systematic process of evaluating, prioritizing, and assigning reported defects based on their severity, impact, and urgency.

### The Seven Phases

| # | Phase | Description | Key Activities |
|---|-------|-------------|----------------|
| 1️⃣ | **Identification** | Bug discovery | Testing, user feedback, automated monitoring |
| 2️⃣ | **Verification** | Validity check | Confirm genuine defect (not user error/duplicate/feature request) |
| 3️⃣ | **Categorization** | Classification | Type: UI, Performance, Functionality, Security, Data |
| 4️⃣ | **Severity Assessment** | Technical impact | Critical → Major → Minor → Cosmetic |
| 5️⃣ | **Priority Assignment** | Business urgency | P1 (Critical) → P2 (High) → P3 (Medium) → P4 (Low) |
| 6️⃣ | **Assignment** | Ownership | Route to appropriate developer/team based on expertise |
| 7️⃣ | **Tracking** | Resolution monitoring | Progress updates until closure |

### Severity vs Priority

| Attribute | Definition | Example |
|-----------|------------|---------|
| ⚡ **Severity** | Technical impact on system functionality | Login crash = High Severity |
| 🎯 **Priority** | Business urgency for resolution | Admin-only feature = Lower Priority |

> 💡 **Note:** A bug can be high severity but low priority (e.g., crash in rarely-used admin feature) or low severity but high priority (e.g., typo on landing page during marketing campaign).

---

## ⭕ Holacracy Fundamentals

### What is Holacracy?

Holacracy is a decentralized management framework that distributes authority throughout self-organizing teams called **circles**, replacing traditional hierarchical structures with explicit roles and accountabilities.

### Core Concepts

#### 👤 Roles (Not Job Titles)

| Element | Description |
|---------|-------------|
| 🎯 **Purpose** | The goal the role serves |
| 🏠 **Domain** | What the role controls |
| ✅ **Accountabilities** | Ongoing activities the role performs |
| 🔄 **Multi-role** | One person can hold multiple roles |
| 🤝 **Collective** | Roles are defined collectively through governance |

#### ⭕ Circles

| Characteristic | Description |
|----------------|-------------|
| 🔵 Semi-autonomous | Self-organizing groups |
| 🎯 Purpose-driven | Each has a defined purpose and domain |
| 📅 Self-governing | Conducts own governance and tactical meetings |
| 📊 Nested | Hierarchically organized (circles within circles) |
| 🔄 Adaptive | Self-organize internally to achieve goals |

#### 🔑 Key Structural Roles

| Role | Symbol | Responsibility |
|------|--------|---------------|
| **Lead Link** | 🔗 | Sets priorities within circle, assigns people to roles (does NOT manage people) |
| **Rep Link** | 🔄 | Represents sub-circle in parent circle meetings, ensures alignment |
| **Facilitator** | 🎙️ | Runs tactical and governance meetings using defined process |
| **Secretary** | 📝 | Maintains records, interprets governance, schedules meetings |

---

## 🐛 Bug Triage in Holacracy

### Recommended Flow

```
╔═══════════════════════════════════════════════════════════════════╗
║                    🐛 BUG REPORTED                                ║
║         (via testing, user feedback, monitoring)                  ║
╚═══════════════════════════════╦═══════════════════════════════════╝
                                ║
                                ▼
╔═══════════════════════════════════════════════════════════════════╗
║                  ⭕ CIRCLE DOMAIN CHECK                           ║
║           Which circle owns this functionality?                   ║
╚═══════════════════════════════╦═══════════════════════════════════╝
                                ║
                                ▼
╔═══════════════════════════════════════════════════════════════════╗
║                   📅 TACTICAL MEETING                             ║
║    • Bug raised as "tension" by any role-holder                   ║
║    • Severity/Priority assessed                                   ║
║    • Assignment based on role accountabilities                    ║
╚═══════════════════════════════╦═══════════════════════════════════╝
                                ║
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
╔═════════════════════════╗       ╔═════════════════════════╗
║   ⭕ WITHIN CIRCLE      ║       ║   🔄 CROSS-CIRCLE       ║
║                         ║       ║                         ║
║ • Role-holder takes     ║       ║ • Rep Link escalates    ║
║   ownership             ║       ║   to parent circle      ║
║ • Autonomous on HOW     ║       ║ • Lead Links            ║
║   to fix                ║       ║   coordinate handoff    ║
║ • Honors policies       ║       ║ • IDM resolves          ║
║   and domains           ║       ║   disputes              ║
╚═══════════╦═════════════╝       ╚═══════════╦═════════════╝
            │                                 │
            └─────────────────┬───────────────┘
                              │
                              ▼
╔═══════════════════════════════════════════════════════════════════╗
║                      ✅ RESOLUTION                                ║
║    • Fix implemented by accountable role-holder                   ║
║    • Verified and closed                                          ║
║    • Learnings captured if systemic                               ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 🔀 Handling Cross-Circle Bugs

When a bug spans multiple circles:

| Step | Action | Description |
|------|--------|-------------|
| 1️⃣ | **Identify primary domain** | Which circle is most impacted? |
| 2️⃣ | **Rep Link communication** | Sub-circle representative raises in parent circle |
| 3️⃣ | **Lead Link coordination** | Parent circle's Lead Link facilitates handoff |
| 4️⃣ | **Integrative Decision Making** | Resolves priority conflicts without hierarchy |

---

## 🎯 Prioritization Framework

### Priority Levels

| Priority | Symbol | Definition | Response Time | Holacracy Handling |
|----------|--------|------------|---------------|-------------------|
| **P1 - Critical** | 🔴 | System down, data loss, security breach | ⚡ Immediate | Lead Link can override normal priorities; all hands |
| **P2 - High** | 🟠 | Major feature broken, significant user impact | ⏰ 24-48 hours | Top of next tactical meeting agenda |
| **P3 - Medium** | 🟡 | Feature degraded, workaround exists | 📅 1-2 weeks | Backlog; role-holder decides timing within sprint |
| **P4 - Low** | 🟢 | Minor/cosmetic issues | 📋 As capacity allows | Addressed opportunistically |

### Severity Classification

| Severity | Symbol | Impact | Examples |
|----------|--------|--------|----------|
| **Critical** | 💀 | System unusable, data corruption | Application crash, data loss, security vulnerability |
| **Major** | ⚠️ | Core functionality impaired | Feature doesn't work, significant performance degradation |
| **Minor** | 📝 | Non-critical functionality affected | Edge case failures, minor UX issues |
| **Cosmetic** | 💄 | No functional impact | Typos, alignment issues, color inconsistencies |

### Priority Matrix

|                    | 📈 High Business Impact | 📉 Low Business Impact |
|--------------------|------------------------|------------------------|
| ⚡ **High Severity** | 🔴 P1 - Critical | 🟠 P2 - High |
| 💤 **Low Severity**  | 🟠/🟡 P2/P3 - High/Medium | 🟢 P4 - Low |

---

## 🏗️ Circle Structure for QA

### Example Organization

```
🏢 [General Company Circle]
│
├── 📦 [Product Circle]
│   │
│   ├── 💻 [Development Circle]
│   │   ├── 🎨 Frontend Role
│   │   ├── ⚙️ Backend Role
│   │   ├── 🧪 QA/Testing Role ← Primary bug reporter
│   │   └── 🔧 DevOps Role
│   │
│   ├── 🎭 [Design Circle]
│   │   └── 🔬 UX Research Role ← Usability bug intake
│   │
│   └── 🚀 [Release Circle]
│       └── 🛡️ Stability Role ← Production bug ownership
│
├── 💬 [Customer Success Circle]
│   ├── 🎧 Support Role ← External bug intake
│   └── 📊 Customer Feedback Role
│
└── 🖥️ [Platform Circle]
    ├── 🔒 Security Role ← Security bug ownership
    └── 🌐 Infrastructure Role
```

### 📋 Role Accountabilities for Bug Management

#### 🧪 QA/Testing Role
| Accountability |
|---------------|
| ☐ Identifying and documenting bugs during testing |
| ☐ Providing severity assessment and reproduction steps |
| ☐ Verifying bug fixes |

#### 🎧 Support Role
| Accountability |
|---------------|
| ☐ Triaging customer-reported issues |
| ☐ Escalating confirmed bugs to appropriate circle |
| ☐ Communicating resolution status to customers |

#### 🔗 Lead Link (any circle)
| Accountability |
|---------------|
| ☐ Setting priorities when conflicts arise |
| ☐ Ensuring bugs are assigned to appropriate roles |
| ☐ Removing blockers for high-priority issues |

#### 🛡️ Stability Role
| Accountability |
|---------------|
| ☐ Owning production incident response |
| ☐ Coordinating hotfix deployments |
| ☐ Post-incident analysis and prevention |

---

## 📅 Meeting Formats

### 🔄 Tactical Meeting (Weekly)

Used for operational coordination including bug triage:

| # | Phase | Description |
|---|-------|-------------|
| 1️⃣ | **Check-in Round** | Brief personal check-in |
| 2️⃣ | **Checklist Review** | Recurring action status |
| 3️⃣ | **Metrics Review** | Including bug metrics |
| 4️⃣ | **Project Updates** | Including active bug fixes |
| 5️⃣ | **Triage** | Process new bugs as tensions |
|   | ↳ Sub-steps | • Anyone can raise a bug |
|   |            | • Clarifying questions |
|   |            | • Quick severity/priority assessment |
|   |            | • Assignment to appropriate role |
| 6️⃣ | **Closing Round** | Reflections |

### ⚙️ Governance Meeting (As Needed)

Used for structural changes:

| Purpose |
|---------|
| ☐ Creating new roles for bug management |
| ☐ Defining accountability boundaries |
| ☐ Establishing policies for triage process |
| ☐ Uses **Integrative Decision Making** process |

### 🤝 Integrative Decision Making (IDM)

For resolving disagreements on bug priorities:

| Step | Phase | Description |
|------|-------|-------------|
| 1️⃣ | **Present Proposal** | Role-holder presents suggested priority |
| 2️⃣ | **Clarifying Questions** | Information gathering only |
| 3️⃣ | **Reaction Round** | Each person shares thoughts |
| 4️⃣ | **Amend & Clarify** | Proposer can modify |
| 5️⃣ | **Objection Round** | Valid objections only (must be reasoned) |
| 6️⃣ | **Integration** | Modify to address objections |
| 7️⃣ | **Final Check** | Confirm no remaining objections |

---

## 💡 Key Principles

### Holacracy Principles Applied to Bug Management

| Principle | Symbol | Application to Bug Triage |
|-----------|--------|--------------------------|
| **Distributed Authority** | 🔀 | No single "bug czar"; accountability lies with roles, not managers |
| **Tensions Drive Work** | ⚡ | Bugs are "tensions" (gaps between current and ideal state) anyone can raise |
| **Consent-Based Decisions** | 🤝 | Priority disputes resolved through IDM, not hierarchy |
| **Transparency** | 👁️ | All roles, accountabilities, and bug states visible to organization |
| **Process Over Politics** | 📋 | Triage meetings follow strict facilitation to prevent dominance |
| **Autonomy in Execution** | 🎯 | Role-holder decides HOW to fix; only WHAT is governed collectively |

### ✅ Best Practices Summary

| # | Practice | Description |
|---|----------|-------------|
| 1️⃣ | **Define clear domains** | Each circle knows what bugs they own |
| 2️⃣ | **Use structured meetings** | Tactical meetings prevent bugs from falling through cracks |
| 3️⃣ | **Assign to roles, not people** | Ensures continuity if people change roles |
| 4️⃣ | **Document criteria** | Consistent severity/priority definitions |
| 5️⃣ | **Empower role-holders** | Trust them to resolve within their accountability |
| 6️⃣ | **Regular metrics review** | Track bug trends in tactical meetings |
| 7️⃣ | **Cross-circle communication** | Rep Links ensure nothing gets lost between circles |

---

## 📚 References

### 🐛 Bug Triage
- [Atlassian Bug Triage Guide](https://www.atlassian.com/agile/software-development/bug-triage)
- [Chromium Triage Best Practices](https://www.chromium.org/for-testers/bug-reporting-guidelines/triage-best-practices/)
- [BrowserStack Bug Triage Process](https://www.browserstack.com/guide/bug-triage-process)

### ⭕ Holacracy
- [Holacracy Official Site](https://www.holacracy.org/)
- [Holacracy Constitution](https://www.holacracy.org/constitution)
- [Reinventing Organizations Wiki - Holacracy](https://reinventingorganizationswiki.com/en/cases/holacracy/)

---

*📅 Document created: February 13, 2026*
