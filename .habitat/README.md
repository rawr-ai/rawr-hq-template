# RAWR Habitat Authority

This tree is RAWR HQ-Template's repository-local structural authority. The
standalone Habitat check binary executes these packets, but it does not own or
amend their constraints.

```text
.habitat/blueprints/<kind>/<packet>/
.habitat/rawr/<niche>/rules/<packet>/
```

- `blueprints/` contains reusable package-shape constraints.
- `rawr/` contains Template-specific command-channel and dependency-direction
  constraints, including the closed controller projection that reaches them.
- Every rule is read-only, has a stable `rule.json`, and carries a locked
  `baseline.json` beside its `structure.toml` or `pattern.md`.

The active set is intentionally small: one service topology, one command
channel/controller-projection topology, and one dependency-direction boundary.

See [[AUTHORITY|the authority boundary]] and
[[openspec/changes/retire-mixed-plugin-lifecycle/SERVICE_TOPOLOGY|the lifecycle service topology]].
