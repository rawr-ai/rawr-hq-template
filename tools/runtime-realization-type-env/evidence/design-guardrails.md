# Runtime Realization Lab Design Guardrails

This lab exists to de-risk the runtime realization spine before migration. It is a contained proving ground, not production SDK/runtime code. These guardrails define how to add evidence without creating theatrical tests, hidden architecture decisions, or false confidence.

## Stable Proof Categories

Use these categories consistently in `proof-manifest.json`, reports, and review notes.

| Category | Meaning | Minimum evidence |
| --- | --- | --- |
| `proof` | Type/shape rule enforced by the lab facade and fixtures. | Positive fixture or negative fixture with a named gate. |
| `vendor-proof` | Installed vendor behavior or shape the lab relies on. | Real dependency, real compile/runtime probe, and wording that does not claim RAWR runtime integration. |
| `simulation-proof` | Contained RAWR-owned integration behavior in either the current mini-runtime lane or the older compatibility simulation lane. | Mini-runtime or simulation test that crosses a RAWR-owned boundary, with the manifest oracle naming which lane owns the proof. |
| `xfail` | Known unresolved architecture or design gap. | TODO fixture or evidence entry with an oracle and stop condition. |
| `todo` | Planning inventory, not proof. | Manifest entry plus a clear reason it is not compiled or executed yet. |
| `out-of-scope` | Important but intentionally outside this lab. | Explicit boundary statement and migration/spec destination. |

Do not promote an entry to proof because it compiles. Promote it only when the gate would fail if the intended RAWR claim regressed.

## Violation Categories

These are the recurring failure modes this lab must catch.

| Violation | What it looks like | Correct handling |
| --- | --- | --- |
| Vendor theater | A test only proves a library exposes or lacks its own API. | Remove it, or downgrade to vendor-fidelity smoke if RAWR must adapt that shape. |
| Fictional vendor API | A test asserts behavior for an API the vendor never claims, such as native oRPC `.effect(...)`. | Remove it. Test RAWR `.effect(...)` in the SDK authoring lane. |
| Facade overclaim | A local alias or wrapper is described as production SDK/runtime behavior. | Reword as lab facade, simulation, or xfail. |
| Simulation promotion | Mini-runtime success is treated as production runtime proof. | Mark as `simulation-proof`; list production path still needed. |
| Raw vendor primitive proof | Direct `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, or `Stream` demos are counted as spine proof. | Route through a RAWR-owned process-local wrapper, or keep as vendor notes only. |
| Hidden design decision | A fixture chooses unresolved API shape without naming the issue. | Fence as `xfail` or add an explicit design decision packet before proving. |
| Optional proof without oracle | A test passes but does not state what failing would mean. | Add or sharpen the oracle before keeping the test. |
| Scope leak | Lab imports production code, joins root gates, becomes a workspace package, or exports public SDK surfaces. | Reject in structural guard; production work belongs to migration slices. |
| Stale authority drift | Quarantined or older specs override the current runtime realization spec. | Treat older docs as provenance only and cite the current authority path/hash. |
| Runtime path collapse | Derivation, compilation, provisioning, invocation, adapter lowering, and harness mounting are blurred. | Split the claim by lifecycle phase and prove each boundary separately. |

## Verification Categories

Every new claim should state which verification lane owns it.

| Lane | Use for | Not enough for |
| --- | --- | --- |
| Typecheck | Public authoring shape, discriminated refs, facade narrowing, invalid imports. | Runtime behavior or vendor semantics. |
| Negative fixtures | Forbidden patterns such as `.handler(...)`, `fx`, portable closures, raw runtime leaks. | Proving a positive runtime path. |
| Vendor Effect | Effect mechanics the RAWR facade/runtime depends on. | Final RAWR runtime substrate contract. |
| Vendor boundaries | TypeBox/oRPC/Inngest/Bun shapes RAWR must adapt. | Adapter behavior, durable scheduling, HTTP serving, or production host mounting. |
| Mini runtime | RAWR-owned registry, invocation, managed runtime access, fake adapter delegation, deployment handoff. | Production bootgraph, service cache, real harnesses, persistence, telemetry export. |
| Simulation | Compatibility proof for the first lab spine. | New canonical runtime behavior once a mini-runtime lane exists. |
| Structural guard | Containment, manifest hygiene, pinned authority, allowed imports, required docs. | Behavioral correctness. |
| Report | Human-readable status and proof strength. | A replacement for gates. |

## Review Categories

Run these reviews before committing meaningful lab changes.

| Review | Question |
| --- | --- |
| Mechanical | Are paths, Nx targets, aliases, manifest entries, and required docs aligned? |
| Architectural | Does the change preserve the accepted runtime lifecycle and avoid a second execution model? |
| Vendor fidelity | Is real vendor behavior used where claimed, and are vendor-shape checks not overstated? |
| SDK ergonomics | Does the authoring pattern stay agent-friendly, declarable, and one-way-per-kind? |
| Evidence honesty | Does each proof status match the strength of the actual gate? |
| Test-theater audit | Would the test still matter if the vendor library is assumed correct? |
| Migration realism | Does the lab reduce migration risk, or only prove a toy artifact? |
| Scope containment | Did production packages, root gates, workspaces, or public exports remain untouched? |

Use `phased-agent-verification-workflow.md` for the repeatable team workflow that applies these reviews across spec, lab, and migration burn-down work.

## Adding Or Changing Evidence

1. Identify the spine claim and lifecycle phase.
2. Decide whether the claim is type, vendor, simulation, mini-runtime, xfail, todo, or out-of-scope.
3. Write the oracle before writing the test.
4. Add or update the smallest fixture/test needed to falsify the claim.
5. Update `proof-manifest.json` with fixtures and gates.
6. Update `evidence/focus-log.md` and `proof-manifest.currentExperiment` when the current experiment changes.
7. Update `vendor-fidelity.md` only for vendor-specific behavior or shape claims.
8. Update `runtime-spine-verification-diagnostic.md` if the status of a load-bearing migration component changed.
9. Run the relevant focused target, then `runtime-realization-type-env:gate`.

## Promotion Rules

- `todo` to `xfail`: when a concrete unresolved architecture question has a fixture or oracle.
- `xfail` to `proof`: only after the spec decision is accepted and a gate proves the claim.
- `vendor-proof` to `simulation-proof`: only when a RAWR-owned wrapper or adapter consumes the vendor behavior.
- `simulation-proof` to production readiness: never inside this lab alone. Production readiness requires a migration slice.
- Removed proof: delete or downgrade the manifest entry in the same change that removes the gate.

## Current Hard Lines

- Native oRPC `.effect(...)` is not a meaningful test. RAWR `.effect(...)` belongs to the SDK authoring lane.
- Inngest handoff shape is not durable scheduling proof.
- TypeBox shape validation is only proof after adaptation into `RuntimeSchema`.
- Direct Effect primitive demos are vendor fidelity only unless routed through RAWR-owned runtime wrappers.
- Fake adapters can prove delegation shape, not production Elysia/Inngest/OCLIF/web/agent/desktop mounting.
- Deployment handoff can prove refs-only/control-plane shape, not placement or deployment behavior.
- The lab may reveal spec gaps. It must not silently resolve them.
