# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RAWR HQ-Template `6c0fe651809f7ff2e3a1d620be1f44e202247787` | DESIGN | oRPC director | `openspec/changes/consolidate-research-experiment-sdk/**` | `6c0fe651809f7ff2e3a1d620be1f44e202247787` (blocking corrections returned) | Accepted Template simplification target is not yet settled; BUILD is prohibited | Correct frame; exact peer acceptance; restack; vendor verification; then BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
