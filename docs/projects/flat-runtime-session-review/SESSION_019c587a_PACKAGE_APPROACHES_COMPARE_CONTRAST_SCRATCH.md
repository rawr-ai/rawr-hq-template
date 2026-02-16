# SESSION_019c587a Package Approaches - Compare/Contrast Scratch

## Purpose
Side-by-side comparison of two opposing package-architecture approaches with full end-to-end examples and mutual critique.

## Source Documents
- Approach A: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Approach B: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_B_BOUNDARY_OR_RUNTIME_CENTRIC_E2E.md`

## Core Thesis
- Approach A: packages are domain-first and runtime-agnostic; boundary contracts/orchestration live in plugins; `rawr.hq.ts` composes once.
- Approach B: split package layer into `*-domain` + `*-boundary`; boundary packages own API/workflow contracts and reusable runtime primitives; plugins become thin wrappers.

## Clarification Alignment (Your Latest IO/Schema Clarification)
- Approach A alignment: high. It treats standalone package schemas as domain-only and embeds IO shapes in contracts at boundary/internal contract sites.
- Approach B alignment: partial. It agrees on domain-core purity but intentionally extends package ownership to boundary/runtime primitives and allows extracted boundary schema modules where reuse pressure exists.

## Contract Ownership Mapping (A vs B)

| Concern | Approach A | Approach B |
| --- | --- | --- |
| Domain schemas/types | `packages/<capability>/src/domain/*` | `packages/<capability>-domain/src/*` |
| Internal domain contract | package-owned | domain package-owned |
| API boundary contract | plugin-owned (`plugins/api/*`) | boundary package-owned (`packages/<capability>-boundary/src/api-contract.ts`) |
| Workflow/event boundary contract | plugin-owned (`plugins/workflows/*`) | boundary package-owned (`packages/<capability>-boundary/src/workflow-contract.ts`) |
| Runtime primitives (`implement`, Inngest function builders) | plugin-owned | boundary package-owned (`.../runtime/*`) |
| Plugin role | boundary contract + runtime glue + policy | mostly policy wrappers around boundary package primitives |
| Composition authority | `rawr.hq.ts` | `rawr.hq.ts` |
| Host role | mount-only | mount-only |

## Option Framing Against Your (a/b/c)
- Approach A is closest to hybrid between:
  - (b) package owns internal contract/domain logic, plus
  - boundary-layer contracts in plugins (not in domain package).
- Approach B is not (a) in the broad sense of "contracts everywhere in each runtime plugin"; it is closer to:
  - domain contract in domain package + boundary contracts in boundary package,
  - explicitly avoiding plugin-local contract duplication.
- Neither approach selects (c) "contracts only in plugins" as the global default.

## End-to-End Flow Comparison

### API flow
- Approach A:
  1. API plugin defines boundary contract (A2) or reuses package internal contract (A1).
  2. API plugin maps into domain service/internal contract.
  3. API plugin handles boundary semantics (HTTP shaping/auth/policy) directly.
- Approach B:
  1. Boundary package defines API contract.
  2. Boundary package exports ORPC runtime surface primitive.
  3. API plugin mostly wraps/delegates to boundary primitive for policy toggles.

### Workflow flow
- Approach A:
  1. Workflow plugin defines event payload contract.
  2. Workflow plugin owns Inngest step orchestration.
  3. Plugin calls domain service.
- Approach B:
  1. Boundary package defines workflow/event contract.
  2. Boundary package exports workflow runtime primitive.
  3. Workflow plugin delegates with thin wrapper/policy.

### Composition + host flow
- Both:
  - `rawr.hq.ts` composes ORPC + Inngest outputs.
  - `apps/server/src/rawr.ts` mounts manifest outputs only.

## What Each Side Criticized

### A’s critique of B
- B blurs package mental model by putting runtime primitives in package layer.
- B adds package/version coordination cost (`*-domain` + `*-boundary`).
- B may over-centralize boundary ownership too early when plugin-edge policy changes fast.
- A adopted one B-inspired concession: promote repeated boundary glue into boundary package only after duplication threshold (2+ adapters).

### B’s critique of A
- A’s purity story can be structurally inconsistent if package modules import runtime libs.
- A1/A2 dual path can create ownership branching and drift.
- A can still risk event/intent drift if boundary event semantics are not centralized.
- B claims clearer scaling by making boundary artifact ownership explicit in package layer.

## Simplicity vs Scale Trade-off
- Approach A optimizes for immediate clarity and minimal package proliferation.
- Approach B optimizes for cross-surface reuse and centralized drift control at scale.
- Key tension: early simplicity (A) vs earlier standardization/reuse substrate (B).

## Migration Churn Comparison
- Approach A churn profile:
  - Lower initial structural churn.
  - More risk of duplicated boundary glue until promotion criteria trigger.
- Approach B churn profile:
  - Higher initial structural churn (new boundary packages per capability).
  - Lower long-run glue duplication once pattern stabilizes.

## Decision Pressure Points (What Actually Decides A vs B)
1. How often boundary glue repeats across surfaces for the same capability.
2. How frequently boundary semantics change independently of domain semantics.
3. Team preference for package-layer strictness vs package-layer standardization.
4. Enforcement maturity (lint/import rules, contract snapshots, event compatibility tests).

## Concrete Evaluation Gate (Suggested)
Use this gate per capability:
- Start with A by default.
- Promote to B-style boundary package only if all are true:
  1. Same boundary glue appears in >=2 adapters/surfaces.
  2. Boundary contract is consumed by >=2 non-plugin consumers (e.g., web + tests).
  3. Drift incidents or coordination overhead are observed across plugin-local contracts.

## Current Read
- If choosing one baseline now, A is lighter for immediate implementation.
- If planning for high capability count + repeated multi-surface reuse soon, B becomes attractive earlier.
- A-with-promotion-gate captures most benefits of both while minimizing premature structure.
