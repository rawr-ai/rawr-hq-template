# Research Experiment Service Consolidation

This OpenSpec change is the sole design, migration, and coordination record for
the shared research operational plane. The oRPC and Inngest vaults retain their
study content, fixtures, results, and evidence.

## Blackboard

| Epoch | Repository + HEAD | Phase | Active writer | Claimed paths / slice | Review commit | Blockers | Next legal transition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | RAWR HQ-Template `ce282cb062f0d4bdeb80117a021aa0c766537991` | DESIGN | oRPC director | Existing OpenSpec only; deletion-first recut to the canonical Habitat service/resource/provider architecture | Git/Bun exact counterpart ACCEPT at `ce282cb062f0d4bdeb80117a021aa0c766537991` | Exact checkpoint acceptance and restack onto the authoritative Template service/vendor closure | Commit one immutable checkpoint; exact Inngest and steward acceptance before service/resource BUILD |

## Record

- [[proposal]] states why the consolidation exists and what it excludes.
- [[design]] defines the domains, interfaces, flow, topology, migration, and
  falsifiers.
- [[tasks]] is the bounded execution record.
- [[specs/research-experiment-service/spec]] is the normative capability delta.

The table above is coordination state only. It is not service runtime state,
evidence authority, a lease service, or a workflow engine.
