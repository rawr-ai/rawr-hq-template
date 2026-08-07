# Workstreams

Habitat owns the generic Workstream Plugin Pack at
`tools/workstream-plugin-pack/`. It is reusable repository tooling, not curated
agent-plugin content and not a bridge to another repository.

The pack owns:

- the workstream runner and review-loop skills;
- reusable record, packet, finding, deferred-inventory, and Next Packet assets;
- provider-neutral steward role briefs;
- reusable mechanical hook scripts.

The local installer may project those Habitat-owned assets only into this
Habitat checkout's `.agents/` and `.codex/` activation homes. It has no
Marketplace target. A content repository may consume a future
versioned tool or artifact interface, but a checkout path, copied tree, or Git
relationship is never that interface.

Repo-local workstream skill and workstream-agent projections are generated
local tool outputs. They must not be checked in as placeholders or redefine
generic workstream mechanics. Habitat owns one checked-in
`.codex/hooks.json` composition boundary and its standing Habitat roles. That
hook config invokes the pack's canonical hook sources directly; the workstream
installer must not rewrite it or create a second hook-source projection.

Runtime Realization Lab material under `tools/runtime-realization-type-env/`
may specialize workstreams with lab-specific authority order, proof/evidence
classes, gates, evidence homes, and phase dossier placement. It must not own
the generic workstream schema or lifecycle model.
