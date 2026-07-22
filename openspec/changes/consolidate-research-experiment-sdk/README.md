# Research Experiment SDK Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research SDK. The oRPC and Inngest vaults retain their study content,
fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | RAWR HQ-Template `e8f27f389eb15fa98898371e87a2e265aee83d93` on `911f319c3d3abdab5255d831e8e16ee16543c3bf` | DESIGN | oRPC director | vendor closure in this OpenSpec only | Pre-restack frame `f388775abfbec88f4f732669782329e535fc1de0` accepted by both directors; content replayed unchanged | Vendor disposition needs exact review; plugin provenance is a BUILD source-freeze obligation | Commit vendor disposition; exact peer review; then BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-sdk/spec]] is the normative capability delta.

The table above is coordination state only. It is not SDK runtime state,
evidence authority, a lease service, or a workflow engine.
