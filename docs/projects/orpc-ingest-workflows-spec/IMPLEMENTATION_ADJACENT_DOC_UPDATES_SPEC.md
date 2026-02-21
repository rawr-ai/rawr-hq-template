# Implementation-Adjacent Doc Updates Spec (D-015, D-016 Compatibility)

## Document Role
This file is the packet-local execution contract for future downstream documentation/runbook/testing-doc updates.
It defines what must be updated, where it must be inserted, and what acceptance evidence is required.

This document remains packet-only by design:
1. keep D-005..D-012 unchanged,
2. preserve D-013 and D-014 compatibility,
3. preserve D-016 seam-contract compatibility,
4. defer external-doc edits to a dedicated downstream execution pass.

## Status
- Spec contract in packet: complete.
- External docs/runbooks/testing-doc execution: deferred.
- D-015 decision registration in `DECISIONS.md`: locked.

## Non-Negotiable No-Drift and Compatibility Baseline
1. Route/caller policy is fixed:
   - first-party default `/rpc` via `RPCLink`,
   - external publication `/api/orpc/*` and `/api/workflows/<capability>/*` via `OpenAPILink`,
   - runtime ingress `/api/inngest` only.
2. `/api/inngest` is never a caller-facing API route.
3. Plugin-owned boundary contract ownership remains unchanged.
4. D-009 and D-010 remain open/non-blocking.
5. D-013 compatibility is mandatory:
   - runtime composition identity keys are `rawr.kind` + `rawr.capability`,
   - `templateRole`, `channel`, `publishTier`, `published` are forbidden legacy keys in non-archival runtime/tooling/scaffold metadata surfaces.
6. D-014 compatibility is mandatory for downstream planning in this packet:
   - reusable harness helpers are package-first,
   - import direction remains one-way (`plugins/*` suites -> `packages/*` helpers; package suites do not import plugin runtime modules).
7. Downstream checks must include: `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard`.
8. D-016 compatibility is mandatory at policy/seam level:
   - default consumer distribution posture is instance-kit/no-fork-repeatability; long-lived fork posture is maintainer-only by default,
   - manifest-first composition authority remains `rawr.hq.ts` with runtime identity keyed by `rawr.kind` + `rawr.capability`,
   - downstream testing docs/runbooks MUST require alias/instance seam assertions and MUST require no-singleton-global negative assertions,
   - do not introduce deferred UX/packaging mechanics into downstream execution contract language.

## D-015 Locked Statement (Verbatim)
Use this verbatim when validating D-015 language in `DECISIONS.md`:

1. Axis 12 is the canonical testing harness and verification-layer authority for ORPC + Inngest packet behavior.
2. Downstream process/runbook/testing docs MUST align to the Axis 12 caller/route harness matrix.
3. `/api/inngest` is runtime-ingress verification only and is never a caller-facing boundary API path.
4. D-013 and D-014 compatibility constraints apply to all downstream testing-doc/runbook updates.
5. This decision locks documentation/testing contract obligations; rollout sequencing remains implementation planning work.

## D-016 Compatibility Addendum (Policy/Seam Level)
Downstream execution updates MUST include these D-016-compatible constraints:
1. Treat instance-kit/no-fork-repeatability as the default consumer distribution posture and maintainer fork posture as non-default consumer path.
2. Keep runtime authority manifest-first (`rawr.hq.ts`) and lifecycle identity keyed by `rawr.kind` + `rawr.capability`.
3. Require alias/instance seam assertions in boundary/runtime verification documentation.
4. Require explicit negative assertions against singleton-global assumptions in instance-aware composition.
5. Keep deferred UX/packaging mechanics out of this implementation-adjacent execution contract.

## Canonical Lifecycle Harness Matrix (Verbatim)
Downstream docs must include this matrix exactly as written.

| Surface/persona | Primary harness | Route family | Required assertions | Required negative assertions |
| --- | --- | --- | --- | --- |
| Web first-party | `RPCLink` | `/rpc` | typed boundary errors, trigger/status behavior, correlation continuity | reject `/api/inngest` |
| Web external/public | `OpenAPILink` | `/api/orpc/*`, `/api/workflows/<capability>/*` | published contract behavior + auth/publication boundaries | reject `/rpc`; reject `/api/inngest` |
| CLI internal command flow | `createRouterClient` | in-process | package flow correctness, middleware dedupe behavior, context contract usage | no local HTTP self-call default |
| API plugin boundary suites | `createRouterClient` + `OpenAPILink` | in-process + `/api/orpc/*` | operation mapping + boundary middleware behavior | reject `/api/inngest` |
| Workflow trigger/status suites | `RPCLink` + `OpenAPILink` + `createRouterClient` | `/rpc` + `/api/workflows/<capability>/*` + in-process preflight | preflight -> enqueue -> status continuity, typed errors, route-family correctness | caller suites reject `/api/inngest`; external suites reject `/rpc` |
| Runtime ingress suites | signed callback transport | `/api/inngest` | signature verification, durable middleware lifecycle, `step.run` lifecycle behavior | do not claim caller-boundary guarantees for `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## Downstream Targets and Required Headings (Exact)
| Target path | Required heading | Missing-file rule |
| --- | --- | --- |
| `docs/PROCESS.md` | `## ORPC + Inngest Route-Aware Verification Contract` | create file if missing |
| `docs/SYSTEM.md` | `## ORPC + Inngest Verification Layers` | create file if missing |
| `docs/process/RUNBOOKS.md` | `## ORPC + Inngest Testing Harness` | create file if missing |
| `docs/process/runbooks/LIFECYCLE_WEB_PLUGIN.md` | `## Verification Harness Selection` | create file if missing |
| `docs/process/runbooks/LIFECYCLE_CLI_PLUGIN.md` | `## Verification Harness Selection` | create file if missing |
| `docs/process/runbooks/LIFECYCLE_WORKFLOW.md` | `## Verification Harness Selection` | create file if missing |
| `docs/process/runbooks/LIFECYCLE_AGENT_PLUGIN.md` | `## Verification Harness Selection` | update only if file exists; if missing, record `SKIPPED_OPTIONAL_TARGET` |
| `docs/process/runbooks/RAWR_HQ_MANIFEST_COMPOSITION.md` | `## Testing Harness Implications of Manifest-Driven Routes` | create file if missing |
| `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md` | `## Boundary Transport Verification Matrix` | create file if missing |
| `docs/process/HQ_USAGE.md` | `## Route-Safe Verification Operations` | create file if missing |
| `docs/process/HQ_OPERATIONS.md` | `## Route-Safe Verification Operations` | create file if missing |
| `docs/process/runbooks/ORPC_INGEST_TEST_HARNESS_MATRIX.md` | full document creation | create if missing, otherwise update |
| `docs/process/MAINTENANCE_CADENCE.md` | `## ORPC + Inngest Harness Drift Checks` | create file if missing |
| `docs/process/AGENT_LOOPS.md` | `## ORPC + Inngest Harness Drift Checks` | create file if missing |

## Directive 1: Gateway Docs (`docs/PROCESS.md`, `docs/SYSTEM.md`)
Required content under headings:
1. Reference Axis 12 as canonical harness authority.
2. Re-state five verification layers exactly: unit, in-process integration, boundary/network integration, runtime ingress verification, E2E.
3. Re-state caller-route split and `/api/inngest` non-caller rule.
4. Re-state D-013 runtime identity keys (`rawr.kind` + `rawr.capability`) and legacy-key hard deletion requirement.

Acceptance checks:
1. All four route families appear in one table with harness mapping.
2. Layer names match Axis 12 exactly.
3. No new architecture semantics beyond packet locks.

## Directive 2: Runbook Index (`docs/process/RUNBOOKS.md`)
Required content under heading:
1. Link to Axis 12.
2. Link to each lifecycle runbook target in this spec: web, CLI, workflow.
3. Link to `RAWR_HQ_MANIFEST_COMPOSITION.md` and `ORPC_OPENAPI_COMPATIBILITY.md`.
4. Explicit note that runtime-ingress verification is separate from caller-boundary verification.

Acceptance checks:
1. All five links above are present.
2. `/api/inngest` is not described as a caller route.

## Directive 3: Lifecycle Runbooks (Web/CLI/Workflow/Optional Agent)
Required content under heading:
1. Include the canonical lifecycle harness matrix rows relevant to the runbook’s surface.
2. Include required positive assertions and required negative assertions for that surface.
3. Include package-first harness ownership and one-way import-direction note.
4. Include D-013 metadata key rule (`rawr.kind` + `rawr.capability`) and forbidden legacy-key hard deletion requirement.
5. Include D-016 seam contract notes:
   - alias/instance seam assertions are required,
   - singleton-global assumptions are forbidden and must be tested negatively.

Required negative tests by runbook:
1. Web: reject `/api/inngest`.
2. CLI internal: no local HTTP self-call default.
3. Workflow: caller paths reject `/api/inngest`; external paths reject `/rpc`.
4. Agent plugin target: apply only when `docs/process/runbooks/LIFECYCLE_AGENT_PLUGIN.md` exists and already contains ORPC workflow trigger/status guidance (`/api/workflows` or workflow `/rpc` trigger references).

Acceptance checks:
1. Each required runbook contains exactly two assertion blocks named `### Positive Assertions` and `### Negative Assertions`.
2. Each required runbook contains a route-family/harness table.
3. Each required runbook contains D-013 and D-014 compatibility notes.
4. Each required runbook contains D-016 seam assertions and no-singleton negative assertions (policy-level, no deferred mechanics).

## Directive 4: Manifest Composition Runbook (`RAWR_HQ_MANIFEST_COMPOSITION.md`)
Required content under heading:
1. Route-family to harness mapping table tied to manifest-owned surfaces.
2. Required checks for new capability surfaces: route-family coverage, negative route assertions, runtime-ingress signature verification.
3. Required CI gate references: `manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`.

Acceptance checks:
1. Table includes `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
2. Table includes required negative assertions.
3. CI gate names appear exactly.

## Directive 5: ORPC/OpenAPI Compatibility Runbook (`ORPC_OPENAPI_COMPATIBILITY.md`)
Required content under heading:
1. Distinguish first-party `/rpc` verification from published OpenAPI verification.
2. Define compatibility checks for `/api/orpc/*` and `/api/workflows/<capability>/*`.
3. Explicit exclusion: `/api/inngest` runtime-ingress tests are not OpenAPI compatibility tests.

Acceptance checks:
1. Compatibility matrix includes transport + route + audience columns.
2. Runtime-ingress row is explicitly marked out-of-scope for caller SDK compatibility.

## Directive 6: HQ Usage and Operations (`HQ_USAGE.md`, `HQ_OPERATIONS.md`)
Required content under heading:
1. Route misuse red-flag list:
   - caller traffic on `/api/inngest`,
   - external `/rpc` usage,
   - missing route-forbidden tests,
   - any active metadata contract still declaring legacy keys (`templateRole`, `channel`, `publishTier`, `published`).
2. Triage steps mapped by caller type (web, CLI, API, workflow runtime).
3. Reference Axis 12 and E2E-04 Section 11 blueprint.

Acceptance checks:
1. Red-flag list includes all four items above.
2. Triage includes route correction + harness correction + CI gate follow-up.

## Directive 7: Canonical Harness Matrix Doc (`ORPC_INGEST_TEST_HARNESS_MATRIX.md`)
Required sections:
1. Caller/route/harness matrix (all six rows from the canonical matrix).
2. Layer purpose boundaries (what each layer proves and must not prove).
3. Negative-route tests by persona.
4. Package-first harness ownership and import-direction contract.
5. TypeScript harness quality rules (typed factories, no implicit `any` in canonical helpers).
6. CI gate checklist including D-013/D-014 compatibility checks.
7. D-016 seam assertions checklist (alias/instance required assertions + no-singleton negative assertions).

Acceptance checks:
1. Web, CLI, API, workflow trigger/status, and runtime-ingress surfaces are all present.
2. `/api/inngest` non-caller rule appears in both matrix and negative-test sections.
3. D-013 and D-014 compatibility checks are explicit.
4. D-016 seam assertions and no-singleton negative assertions are explicit.

## Directive 8: Cadence and Agent-Loop Drift Checks (`MAINTENANCE_CADENCE.md`, `AGENT_LOOPS.md`)
Required content under heading:
1. Scheduled drift checks for forbidden route usage in tests.
2. Scheduled check that in-process suites are not replaced by local HTTP self-calls.
3. Scheduled check for runtime-ingress signature verification coverage.
4. Scheduled check for `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard` coverage.

Acceptance checks:
1. Each check has owner, frequency, and fail condition.
2. Fail conditions are binary and actionable.

## Execution Order for Downstream Pass
1. Validate D-015 lock language and D-016 seam-compatibility language in `DECISIONS.md`.
2. Update `docs/SYSTEM.md` and `docs/PROCESS.md`.
3. Update `docs/process/RUNBOOKS.md`.
4. Update lifecycle runbooks (web, CLI, workflow, optional agent).
5. Update manifest composition and ORPC/OpenAPI compatibility runbooks.
6. Update HQ usage/operations docs.
7. Create/update canonical harness matrix doc.
8. Update cadence/agent-loop docs.
9. Run consistency review and produce execution report.

## Required Execution Report Output
The downstream pass must produce a report with these sections:
1. `updated_targets`: list of updated paths.
2. `created_targets`: list of created paths.
3. `skipped_optional_targets`: include reason (`SKIPPED_OPTIONAL_TARGET`).
4. `matrix_validation`: confirmation that canonical matrix rows are present.
5. `negative_assertion_validation`: confirmation by surface.
6. `d013_d014_validation`: confirmation of metadata and import-direction checks.
7. `d016_seam_validation`: confirmation that alias/instance seam assertions and no-singleton negative assertions were added.
8. `ci_gate_validation`: confirmation of required gate references.

## Completion Criteria for Downstream Pass
1. Every required target path has the required heading and content contract satisfied.
2. No downstream doc suggests caller access to `/api/inngest`.
3. Route-family references are consistent with `ARCHITECTURE.md` and `axes/12-testing-harness-and-verification-strategy.md`.
4. Terminology is stable (`createRouterClient`, `RPCLink`, `OpenAPILink`, runtime ingress callback).
5. D-005..D-015 semantics remain unchanged.
6. D-016 seam-contract obligations are present without introducing deferred implementation mechanics.

## Source Anchors
- [axes/12-testing-harness-and-verification-strategy.md](./axes/12-testing-harness-and-verification-strategy.md)
- [axes/05-errors-observability.md](./axes/05-errors-observability.md)
- [axes/06-middleware.md](./axes/06-middleware.md)
- [examples/e2e-04-context-middleware.md](./examples/e2e-04-context-middleware.md)
- [axes/13-distribution-and-instance-lifecycle-model.md](./axes/13-distribution-and-instance-lifecycle-model.md)
- Archive context: `docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_TESTING_SYNC.md`
