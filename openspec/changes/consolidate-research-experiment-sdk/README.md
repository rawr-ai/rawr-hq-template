# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | RAWR HQ-Template accepted core `bf1b50a5b1e2337a1426f03435dcfec2f9a18c77` | BUILD | oRPC director | Git/Bun adapter and deterministic tests only | Core through `bf1b50a5b1e2337a1426f03435dcfec2f9a18c77` accepted by both directors | None | Commit the Git/Bun adapter; exact Inngest review before the next adapter |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
