# Rawr Product Security Model (v1)

This document describes the local-first Rawr product security posture currently
implemented by `@rawr/security`. It is not Habitat platform security authority;
Habitat-wide security law belongs in its own canonical platform specification.
Rawr runs local code, so its current posture is:

1) **Deterministic checks** run automatically when we enable things.
2) A **gate** blocks enabling if findings exceed the user’s configured tolerance.

LLM “judge” assessment is **parked** (doc only) until explicitly un-parked.

## App Composition Gate

Mounting app-selected plugin projections is an explicit composition boundary. Deterministic
security checks may gate that composition, but composition state is not external
extension state or curated agent lifecycle state. It cannot install, release,
reconcile, or repair either channel.

The retired web-membership command tree has no active compatibility or guidance
surface. Habitat runtime realization must preserve the same composition
gate without inheriting repository-state membership or plugin lifecycle authority.

## Deterministic checks (v1)

Currently implemented in `@rawr/security`:

- **Vulnerabilities:** `bun audit --json`
- **Install scripts trust:** `bun pm untrusted`
- **Secret scan:** staged (`--staged`) or repo (`--repo`) scan for a small set of high-signal patterns (keys/private keys)

Reports are written to:

- `.rawr/security/latest.json`
- `.rawr/security/report-<timestamp>.json`

## Git hook boundary

The repo does not run dependency or staged security checks from `.husky/pre-commit`.
Security checks remain explicit command and plugin-enablement gates.

Repository hooks do not run CLI lifecycle commands or preserve a mirrored
Habitat implementation tree in another repository. Lifecycle validation is an explicit
exact-version tool operation at its owning boundary.

## What this is not

- This is not a sandbox. Plugins can still execute arbitrary code locally.
- The goal is early detection + explicit enablement + auditability, not perfect containment.
