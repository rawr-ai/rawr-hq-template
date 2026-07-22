# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | RAWR HQ-Template `4f34c5f128dbc062c650e5980d4150dd12aebbec` on `911f319c3d3abdab5255d831e8e16ee16543c3bf` | BUILD | oRPC director | package scaffold; core/runtime contracts and tests; necessary root lock, Nx, and Habitat wiring | Frame and vendor closure through `4f34c5f128dbc062c650e5980d4150dd12aebbec` accepted by both directors | None | Commit first BUILD slice; exact Inngest review before adapter breadth |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
