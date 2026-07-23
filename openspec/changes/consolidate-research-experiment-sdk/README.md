# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | RAWR HQ-Template Git/Bun `66694d75a79c73ee11a4aac0d467ad64b9072adc` | BUILD | oRPC director | Git/Bun source-isolation, tool-independence, lock-edge corrections, and deterministic tests only | Exact original Inngest review blocked `66694d75a79c73ee11a4aac0d467ad64b9072adc` on three bounded P1s | Caller source mutation, eager cross-tool admission, and unbound lock edges | Commit the corrected Git/Bun slice; exact original Inngest review before the next adapter |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
