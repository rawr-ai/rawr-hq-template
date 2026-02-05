# Security model (v1, RAWR HQ-Template baseline)

`RAWR HQ-Template` is **local-first** and runs local code. The security posture is therefore:

1) **Deterministic checks** run automatically when we enable things.
2) A **gate** blocks enabling if findings exceed the user’s configured tolerance.

LLM “judge” assessment is **parked** (doc only) until explicitly un-parked.

## Gate point: `hq plugins enable` (gateEnable)

Enabling a plugin is treated as an explicit “activation” boundary.

- `rawr hq plugins enable <id>` runs the security checks and calls the gate.
- If blocked, the command exits non-zero unless `--force` is provided.
- Successful enablement updates persisted repo-local state in `.rawr/state/state.json`.
- Runtime boundary: enabled plugin state is consumed by server/web plugin loading paths.

## Deterministic checks (v1)

Currently implemented in `@rawr/security`:

- **Vulnerabilities:** `bun audit --json`
- **Install scripts trust:** `bun pm untrusted`
- **Secret scan:** staged (`--staged`) or repo (`--repo`) scan for a small set of high-signal patterns (keys/private keys)

Reports are written to:

- `.rawr/security/latest.json`
- `.rawr/security/report-<timestamp>.json`

## Git hook (pre-commit)

The repo ships a `scripts/githooks/pre-commit` hook that runs:

`rawr security check --staged`

This prevents accidental secret leakage from being committed.

## What this is not

- This is not a sandbox. Plugins can still execute arbitrary code locally.
- The goal is early detection + explicit enablement + auditability, not perfect containment.
