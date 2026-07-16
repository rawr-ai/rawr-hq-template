# Workstreams

RAWR HQ-Template owns the generic Workstream Plugin Pack at
`tools/workstream-plugin-pack/`. It is reusable repository tooling, not curated
agent-plugin content and not a bridge to another repository.

The pack owns:

- the workstream runner and review-loop skills;
- reusable record, packet, finding, deferred-inventory, and Next Packet assets;
- provider-neutral steward role briefs;
- reusable mechanical hook scripts.

The local installer may project those Template-owned assets only into this
Template checkout's `.agents/` and `.codex/` activation homes. It has no
personal-repository target. A personal content repository may consume a future
versioned tool or artifact interface, but a checkout path, copied tree, or Git
relationship is never that interface.

Repo-local Codex skill, agent, hook, and hook-config activation files are
generated local tool outputs. They must not be checked in as placeholders or
redefine generic workstream mechanics.

Runtime Realization Lab material under `tools/runtime-realization-type-env/`
may specialize workstreams with lab-specific authority order, proof/evidence
classes, gates, evidence homes, and phase dossier placement. It must not own
the generic workstream schema or lifecycle model.
