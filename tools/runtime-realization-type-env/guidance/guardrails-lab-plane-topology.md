# Runtime Realization Lab Plane Topology

This is the canonical topology guardrail for the Runtime Realization Lab. It
defines where Lab code and evidence belong so Oracle, the Reference Runtime,
scenario packs, and shared SDK/runtime source do not collapse into one
ambiguous proof artifact.

This document does not replace the runtime architecture spec. The
manifest-pinned runtime spec remains architecture authority. This guide only
owns the Lab's internal directory shape, dependency direction, proof ceilings,
and operator routing.

## How To Use This Map

Start here when creating, moving, or reviewing Lab code. Pick the plane first,
then pick the directory. If a file could plausibly live in multiple planes,
route by the strongest ownership rule:

1. Reusable implementation substrate belongs in shared source.
2. Falsification harness code belongs in Oracle.
3. Production-shaped live flow belongs in the Reference Runtime.
4. Business examples belong in scenario packs.
5. Tests live by proof ceiling, not by source-tree convenience.

## Naming Frame

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab | `tools/runtime-realization-type-env`, the self-contained Lab where runtime realization is built and tested without parent repo package/app/service/deployment mutations. |
| Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime plus named gates, test oracles, proof ceilings, vendor-live checks where required, and explicit residuals. |
| Reference Runtime | The full contained runtime-in-a-folder used to exercise live request/workflow/telemetry/control-plane passage inside the Lab. |
| Oracle | The falsification harness and regression substrate used to test stable contracts, boundaries, failure modes, and controlled host behavior. Oracle proof is not Lab-Production Proof by itself. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployments, or public surfaces. Lab-Production Proof can feed Parent-Repo Migration; it does not perform it. |

## Plane Topology

| Plane | Primary paths | Owns | Must not own | Proof ceiling |
| --- | --- | --- | --- | --- |
| Shared SDK/runtime source | `src/sdk/**`, `src/spine/**`, `src/runtime/**`, `src/adapters/**`, `src/vendor/**` | Lab-local candidate authoring facade, portable refs/artifacts, runtime substrate, shared adapter contracts, vendor adaptation seams. | Oracle harness logic, production-shaped app topology, business scenarios, parent repo public exports. | Type/shape proof, vendor-proof, Oracle substrate proof when exercised by tests. |
| Oracle | `src/oracle/**`, `test/oracle/**` | Controlled hosts, falsifiers, regression harnesses, failure observation, compatibility barrels during reorg. | Shared runtime implementation, SDK internals, Reference Runtime live app/server/async/observation topology. | `simulation-proof` and regression substrate. |
| Reference Runtime | `src/reference-runtime/**`, `test/reference-runtime/**` | Future contained runtime-in-a-folder: app, service, provider resource, Elysia/oRPC request, Inngest step passage, telemetry/control-plane observation, stop/finalization behavior. | Oracle-only fake hosts, parent repo migration, package exports, deployment topology changes outside the Lab. | Lab-Production Proof only after honest Reference Runtime gates exist and pass. |
| Scenario packs | `scenarios/**` | Business capability examples consumed by Reference Runtime and selectively by Oracle/conformance tests. | Harness helpers, runtime implementation, generic low-level fixtures. | Scenario evidence only; proof strength comes from the test lane that consumes it. |

## Current Materialization

The current Lab materializes a lab-contained semantic mirror of the runtime
spine. It is useful for proving internal laws and migration-decision evidence,
but it is not the final Nx/package/generator topology and must not be treated
as a parent repo package layout.

The Reference Runtime plane is named and reserved. Until Phase Four is
explicitly opened, `src/reference-runtime/**` and `test/reference-runtime/**`
are README-seeded containers only. They contain no runtime source, no tests, no
gate, and no Lab-Production Proof claim.

## Source Plane Boundaries

Shared source is the candidate reusable material that Oracle and the Reference
Runtime may both consume.

| Path | Responsibility | Boundary |
| --- | --- | --- |
| `src/sdk/**` | Lab-local authoring facade and candidate SDK ergonomics. | May expose canonical-looking `@rawr/sdk/*` imports through local aliases only. Must not become parent repo package authority. |
| `src/spine/**` | Portable refs, artifacts, derivation/compiler contracts, and compatibility simulation helpers. | Must not import Oracle. Any runtime import here is transitional simulation support and should be made explicit. |
| `src/runtime/**` | Candidate runtime substrate: Effect runtime access, process execution, bootgraph/provisioning, provider lowering, service binding, diagnostics, catalog/observation, handoff/control-plane packets. | Must not import Oracle. Must not own scenario business behavior. |
| `src/adapters/**` | Shared adapter contracts, lowering payloads, and delegation seams. | Vendor-specific mounted Oracle hosts stay under `src/oracle/adapters/**` until rewritten for the Reference Runtime. |
| `src/vendor/**` | Narrow vendor probes and RAWR adaptation seams that are useful across planes. | Vendor constructibility does not prove RAWR runtime passage. Semantic changes require official-doc review. |

Current transitional seams:

| Seam | Status | Required handling |
| --- | --- | --- |
| `src/oracle/index.ts` re-exports shared runtime/adapters | Compatibility barrel | Acceptable for current tests. Do not treat it as source ownership. Prefer direct shared-plane imports in new tests. |
| `src/sdk/runtime/providers.ts` uses `src/runtime/provider-plan-internals.ts` | Lab-internal provider-plan bridge | Acceptable until ProviderEffectPlan public/implementation split is redesigned. Do not copy this as final SDK law without a design decision. |
| `src/spine/simulate.ts` and compiler helpers import runtime helpers | Compatibility simulation support | Acceptable only for conformance/simulation lanes. Do not let this imply spine owns runtime execution. |

## Oracle Boundary

Oracle exists to falsify stable properties under tight control:

- descriptor table and registry consistency;
- invocation context binding;
- controlled adapter delegation;
- failure observation and layer-disagreement diagnostics;
- deployment handoff serializability and live-handle rejection;
- boot/finalization ordering under contained hosts.

Oracle does not prove final host lifecycle, durable Inngest scheduling,
HyperDX product visibility, parent repo deployment behavior, or full
Lab-Production Proof by itself. Oracle output should feed the Reference Runtime
as regression substrate and copy/adaptation evidence.

## Reference Runtime Boundary

Reference Runtime is the future production-shaped contained runtime plane. It
should be built when the program opens a bounded proof campaign for
Lab-Production Proof.

Today it is only reserved and README-seeded. Do not add implementation, tests,
or Nx/package/generator ratchets until Phase Four opens with a named proof
slice.

The first honest Reference Runtime gate should exercise one narrow live flow:

- one app;
- one service/capability;
- one provider-backed resource;
- one Elysia/oRPC request;
- one Inngest step passage;
- telemetry/control-plane observation;
- ordered stop/finalization;
- post-stop non-delegation.

The Reference Runtime may consume shared runtime/adapters and scenario packs.
It should not import Oracle implementation except through explicit test-only
regression helpers, and any such bridge must name its deletion target.

## Scenario Pack Boundary

Scenario packs are authored business examples, not generic fixtures. Use
`scenarios/<capability>/**` for capability stories such as Work Items.

Use `fixtures/**` only for test mechanics:

| Path | Use |
| --- | --- |
| `fixtures/inline-negative/**` | Type misuse cases compiled by normal typecheck. |
| `fixtures/fail/*.fail.ts` | Expected one-file type failures checked by the negative gate. |
| `fixtures/todo/**` | Fenced unresolved design experiments excluded from positive typecheck. |

Positive business examples belong in `scenarios/**`, not `fixtures/positive/**`.

## Test Topology

Tests are organized by proof ceiling:

| Lane | Path | Owns |
| --- | --- | --- |
| Conformance | `test/conformance/**` | Type/shape/spine laws, compiler/derivation behavior, compatibility simulation. |
| Vendor | `test/vendor/**` | Real vendor probes only. These protect adaptation facts and stay `vendor-proof`. |
| Oracle harness | `test/oracle/harness/**` | Controlled Oracle host and regression behavior. |
| Oracle falsification | `test/oracle/falsification/**` | Negative runtime observations and failure-mode proof. |
| Reference Runtime | `test/reference-runtime/**` | Future production-shaped contained runtime smoke/integration/e2e gates. |

Do not place a test by the source module it imports. Place it by the claim it
can honestly prove.

## Dependency Direction

Use this direction unless a workstream records a narrower accepted exception:

```text
scenarios
  -> sdk / spine

oracle
  -> scenarios
  -> sdk / spine / runtime / adapters / vendor

reference-runtime
  -> scenarios
  -> sdk / spine / runtime / adapters / vendor

runtime / adapters
  -> sdk / spine / vendor

spine
  -> sdk
```

Forbidden directions:

- shared source importing Oracle;
- Reference Runtime depending on Oracle host implementation as runtime
  substrate;
- scenario packs importing Oracle or Reference Runtime;
- tests or Lab code importing parent repo `apps/*`, `packages/*`,
  `services/*`, or `plugins/*`;
- Lab code exporting parent repo public surfaces.

## Promotion Rules

- Oracle success can promote an entry to `simulation-proof` when the test oracle
  and gate are named.
- Vendor probes can promote only to `vendor-proof` unless a RAWR-owned adapter
  consumes the vendor behavior under a falsifiable gate.
- Lab-Production Proof requires a Reference Runtime gate plus any required
  vendor-live/product gates. It cannot be earned by Oracle metadata or
  simulation proof alone.
- Lab-Production Proof does not authorize Parent-Repo Migration. Migration
  requires a separate accepted slice that owns parent repo/package/deployment
  risk.

## Operator Checklist

Before closing a plane reorg or new workstream:

- Paths match the plane map.
- Imports preserve dependency direction or record an accepted transitional
  seam.
- Tests live under the lane matching their proof ceiling.
- Scenario packs are not called fixtures.
- Manifest fixtures and gates point at existing paths.
- The diagnostic and evidence maps do not overstate the proof ceiling.
- Parent-Repo Migration remains explicitly separate.
