---
description: Review and inspect an external Oclif extension without entering curated agent-plugin lifecycle
argument-hint: "EXTENSION=<package-id|path>"
---

# Lifecycle: External CLI Extension

## Boundary

- External Oclif extensions use only `rawr plugins ...` and native Oclif state.
- Never route an external extension through `rawr agent plugins ...`.
- This workflow does not build, export, or reconcile curated agent plugins.

## Steps

1. Apply the extension source change and update its tests and documentation.
2. Build and test the owning extension project with its repository targets.
3. Audit dependents and package identity changes.
4. Inspect the exact extension without mutating native state:

```bash
rawr plugins inspect "$EXTENSION"
rawr plugins
```

5. Only when the user explicitly requests native mutation, choose the exact
   supported operation: `rawr plugins install`, `rawr plugins link`,
   `rawr plugins update`, `rawr plugins uninstall`, or `rawr plugins reset`.

## Done

- Source checks pass and `rawr plugins inspect` reports the expected identity.
- No curated agent-plugin lifecycle operation ran.
