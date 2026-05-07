# Workstreams

This repository still contains a local Workstream Plugin Pack as a deprecated
bridge/recovery copy. The downstream Habitat plugin is now the distributable
source of truth for reusable Workstream operation:

`/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/agents/habitat/`

The bridge copy remains at `tools/workstream-plugin-pack/` only until the
template-side migration removes it. Do not make new durable Workstream content
changes in the template bridge; migrate any useful material downstream first.

Habitat owns:

- the workstream runner and review-loop skills;
- reusable record, packet, finding, deferred-inventory, and Next Packet assets;
- provider-neutral steward role briefs;
- reusable mechanical hook scripts.

Repo-local Codex skill, agent, hook, and hook-config activation files are
native plugin install outputs from downstream Habitat. They must not be
checked in as placeholders or redefine generic workstream mechanics.

Runtime Realization Lab material under `tools/runtime-realization-type-env/`
may specialize workstreams with lab-specific authority order, proof/evidence
classes, gates, evidence homes, and phase dossier placement. It must not own
the generic workstream schema or lifecycle model.
