# Research Experiment Service Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research operational plane. The oRPC and Inngest vaults retain their
study content, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | RAWR HQ-Template correction base `e668e2f4d8438d64a4a40a41d3ffa3cc415ddfcd` | DESIGN | none; exact review requested | Three bounded docs-only corrections: local crash recovery, diagnostic Git version, and native TypeBox schema ownership; no source paths | Review requested for the exact docs-only child of `e668e2f4d8438d64a4a40a41d3ffa3cc415ddfcd` | No accepted production runtime-provisioning restack target; canonical TypeBox bridge correction remains primary-owned upstream work | Obtain exact Inngest and architecture-steward acceptance, then hold for reviewed upstream before BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The table above is coordination state only. It is not service runtime state,
evidence authority, a lease service, or a workflow engine.
