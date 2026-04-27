# Secondary References

Status: initial preview
Scope: useful context that must not expand migration scope unless explicitly promoted.

Secondary references help the team understand the system and avoid tunnel vision. They are not conflict-winning authority for migration planning.

## Reference-Only Inputs

| Source | Use For | Boundary |
| --- | --- | --- |
| `docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integrated-canonical-architecture-finalization/` | Decision provenance behind the final integrated architecture Cloud Pro packet. Useful if the accepted final spec needs interpretation. | Do not treat packet files or decision records as a parallel architecture source after the final spec lands. |
| `docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/runtime-realization-finalization/` | Provenance for the runtime realization spec and final readiness verdict. | Use only to clarify intent, not to override the promoted runtime spec. |
| `docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/target-authority-reframe/` | Preserves the target-authority posture: current repo reality is migration substrate, not architecture truth. | Use as operating-frame evidence, not as a new migration scope. |
| `/Users/mateicanavra/Documents/projects/RAWR/RAWR_Authentication_Subsystem_Canonical_Spec.md` | Look-ahead hooks for auth verifier resources, runtime profile selection, plugin admission, invocation actor context, service authorization, async authority propagation, and redacted diagnostics. | Candidate companion spec only. Do not make full auth implementation part of the immediate runtime migration unless explicitly promoted. |
| `/Users/mateicanavra/Documents/projects/RAWR/RAWR_Deployment_Realization_Canonical_Spec.md` | Look-ahead hooks for deployment-safe runtime outputs, process-boundary metadata, placement profiles, deployment diagnostics, and platform adapter future work. | Candidate companion spec only. Do not make deployment compiler/platform adapters part of the immediate runtime migration unless explicitly promoted. |
| Broader documentation cleanup outputs | Curated disposition of old docs, stale docs, and first-hop documentation routes. | Consume only the curated results, not raw sweep artifacts, and only after the cleanup lane publishes them. |
| Existing migration plan at `docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md` | Historical sequencing context and prior intent. | Not primary authority until reconciled with final architecture/runtime specs. |

## How To Use Secondary References

Secondary references may:

- clarify why a target decision exists;
- reveal future hooks the runtime migration should not block;
- identify negative-space items for the migration packet;
- help construct proof gates and doc drift checks;
- provide examples to mine, if they match the final authority model.

Secondary references must not:

- introduce new M2 implementation scope;
- override final architecture/runtime specs;
- preserve legacy topology because it appears in older docs;
- create new public API obligations without promotion;
- require auth or deployment implementation in the first runtime realization migration.

## Why Keep Them

The migration team needs peripheral vision. Auth, deployment, diagnostics, telemetry, cache, config, and control-plane concerns are close enough to runtime realization that ignoring them would produce brittle work.

The answer is controlled reference use: preserve hooks and name future lanes, but do not let every useful document become a requirement.
