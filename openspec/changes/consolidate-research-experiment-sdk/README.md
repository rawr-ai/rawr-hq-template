# Research Experiment Service Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research operational plane. The oRPC and Inngest vaults retain their
study content, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | RAWR HQ-Template accepted design `b826254d21d93538edd3f5436ccdc8dbf8500290` | DESIGN | none; shared writes held | Frozen deletion-first Habitat service/resource/provider checkpoint | Exact Inngest and architecture-steward ACCEPT at `b826254d21d93538edd3f5436ccdc8dbf8500290` / tree `256cdb6cc21be8ce7dab10457536a1f7c280d41a` | No accepted production runtime-provisioning restack target; canonical TypeBox bridge correction remains primary-owned upstream work | Receive exact reviewed upstream, restack with Graphite, re-admit closure, then enter BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The table above is coordination state only. It is not service runtime state,
evidence authority, a lease service, or a workflow engine.
