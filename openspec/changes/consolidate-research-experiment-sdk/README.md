# Research Experiment Service Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research operational plane. The oRPC and Inngest vaults retain their
study content, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | RAWR HQ-Template coordination base `583d4edc60313165478a36c49baab936f5e144bc` | DESIGN | none; exact review requested | Docs-only local single-user deletion amendment; no source paths | Review requested for the exact docs-only child of `583d4edc60313165478a36c49baab936f5e144bc` | No accepted production runtime-provisioning restack target; canonical TypeBox bridge correction remains primary-owned upstream work | Obtain exact Inngest and architecture-steward acceptance, then hold for reviewed upstream before BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The table above is coordination state only. It is not service runtime state,
evidence authority, a lease service, or a workflow engine.
