# Security model (v1, RAWR HQ-Template baseline)

`RAWR HQ-Template` is **local-first** and runs local code. The security posture is therefore:

1) **Deterministic checks** run automatically when we enable things.
2) A **gate** blocks enabling if findings exceed the user’s configured tolerance.

LLM “judge” assessment is **parked** (doc only) until explicitly un-parked.

## Gate point: `plugins web enable` (gateEnable)

Enabling a plugin is treated as an explicit “activation” boundary.

- `rawr plugins web enable <id>` runs the security checks and calls the gate.
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

## Git hook boundary

The repo does not run dependency or staged security checks from `scripts/githooks/pre-commit`.
Security checks remain explicit command and plugin-enablement gates.

The pre-commit hook is reserved for repository hygiene checks such as template-managed path routing and plugin install drift.

## What this is not

- This is not a sandbox. Plugins can still execute arbitrary code locally.
- The goal is early detection + explicit enablement + auditability, not perfect containment.
