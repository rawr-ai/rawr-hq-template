# Security model (v1, RAWR HQ-Template baseline)

`RAWR HQ-Template` is **local-first** and runs local code. The security posture is therefore:

1) **Deterministic checks** run automatically when we enable things.
2) A **gate** blocks enabling if findings exceed the user’s configured tolerance.

LLM “judge” assessment is **parked** (doc only) until explicitly un-parked.

## App Composition Gate

Mounting app capabilities is an explicit composition boundary. Deterministic
security checks may gate that composition, but composition state is not external
extension state or curated agent lifecycle state. It cannot install, release,
reconcile, or repair either channel.

The interim `plugins web` command tree is migration evidence and is not canonical
lifecycle guidance. Its eventual qualified app-composition surface must preserve
the same gate without retaining the mixed plugin aggregate.

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

Repository hooks do not run controller lifecycle commands or preserve a mirrored
Template tree in another repository. Lifecycle validation is an explicit
exact-version tool operation at its owning boundary.

## What this is not

- This is not a sandbox. Plugins can still execute arbitrary code locally.
- The goal is early detection + explicit enablement + auditability, not perfect containment.
