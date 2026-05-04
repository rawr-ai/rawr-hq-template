# Workstreams

This repository uses the local Workstream Plugin Pack for reusable workstream
operation.

Canonical generic workstream source:

`tools/workstream-plugin-pack/`

The pack owns:

- the workstream runner and review-loop skills;
- reusable record, packet, finding, deferred-inventory, and Next Packet assets;
- provider-neutral steward role briefs;
- reusable mechanical hook scripts.

Repo-local Codex skill, agent, hook, and hook-config activation files are
generated from the pack only when needed by running the pack install script.
They must not be checked in as placeholders or redefine generic workstream
mechanics.

Runtime Realization Lab material under `tools/runtime-realization-type-env/`
may specialize workstreams with lab-specific authority order, proof/evidence
classes, gates, evidence homes, and phase dossier placement. It must not own
the generic workstream schema or lifecycle model.
