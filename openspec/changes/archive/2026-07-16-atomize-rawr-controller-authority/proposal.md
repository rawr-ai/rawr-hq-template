## Why

RAWR's official command modules and launcher are currently coupled to mutable Oclif links and checkout-backed global wiring, so a supported command can change the implementation of its next invocation or become unavailable when a source worktree disappears. C1 replaces that split authority with one immutable Template-owned controller while preserving genuine external CLI extensions as separately governed user state.

## Authority

- Accepted packet provenance: personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
- Superseding repository boundary: personal RAWR HQ commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md` blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
- The packet objects are design provenance only. This change starts from clean Template `main` and imports no personal source, history, runtime, OpenSpec files, or executable paths.

## What Changes

- **BREAKING**: classify every supported Template-owned command module as an immutable member of one controller release and prevent official modules from being installed, linked, shadowed, or repaired through Oclif user state.
- Replace checkout-owner symlinks and post-checkout executable refresh with activation of a complete controller release under stable Template runtime data.
- Add a controller manifest and provenance checks that bind the payload release entry and every official command module to one release identity and fail read-only on mismatch; the stable selector launcher remains outside that identity.
- Preserve `rawr plugins install|link|uninstall|list|inspect|update|reset` for genuine external extensions, with reserved package, command, topic, alias, and hook validation before extension code can load.
- Make startup and removal recovery-safe when an external extension is missing, broken, colliding, or later deleted.
- Expand `rawr doctor global` to report the selected controller release, launcher, official-module closure, stable data root, and external-extension health without repairing any authority.
- Keep all implementation and state Template-owned. A personal content checkout may later be supplied only through an explicit versioned data interface and never participates in controller selection or command resolution.

## Capabilities

### New Capabilities

- `rawr-controller-authority`: Atomic controller release, stable activation, official-module closure, locator isolation, and complete provenance diagnostics.
- `external-cli-extension-boundary`: Guarded and recovery-safe external Oclif lifecycle that cannot shadow or replace official controller members.

### Modified Capabilities

None. This is the first repository-local OpenSpec root.

## Impact

- Template CLI manifest and startup: `apps/cli/package.json`, `apps/cli/src/index.ts`, `apps/cli/bin/**`, and `apps/cli/src/lib/external-extensions/**`.
- Template controller installation and activation scripts, global doctor, official command-package manifests, architecture guards, and controller/external-extension fixtures.
- Oclif user state becomes external-extension-only; official command packages remain modular source projects but ship and activate only inside the atomic controller release.
- C2-C5 may depend on the controller manifest, stable data locator, and extension guard. Agent release, provider, export, packaging, app-composition, personal-content, and protected-lane implementation are outside C1.
