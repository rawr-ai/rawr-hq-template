# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | RAWR HQ-Template accepted design `c5a94f491e32498306fbb07bf362a7aaeb253d55`; first BUILD slice pending exact commit | BUILD | oRPC director | package scaffold; core/runtime contracts and tests; necessary root lock, Nx, and Habitat wiring | Pending exact first BUILD commit; design through `c5a94f491e32498306fbb07bf362a7aaeb253d55` accepted by both directors | None | Commit first BUILD slice; exact Inngest review before adapter breadth |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
