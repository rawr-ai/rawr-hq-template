# Curated Agent-Plugin Lifecycle Contract

> **Canonical scope**: governed content and release records in an independent
> content repository, operated by the Template-owned controller through explicit
> data, artifact, export, and provider interfaces.
>
> **Related**: [[workflow.md]] and
> [[../../../workflows/lifecycle-agent-plugin.md]].

## Authority

- The content repository owns curated source, vendor provenance, declarative
  policy/evaluation inputs, and its governed release/channel records.
- RAWR HQ-Template owns the controller, lifecycle service, provider adapters,
  schemas, tooling, and generic validation.
- Repository path locates content. It does not create code ancestry, controller
  identity, artifact identity, or provider authority.
- External Oclif extension state belongs only to `rawr plugins ...` and is
  outside this contract.

## Operation Contracts

Select exactly one operation. Its listed authority inputs are sufficient; no
branch silently runs `check`, cleans a checkout, or starts another operation.

- **Source authoring**: `rawr agent plugins create` takes an explicit content
  workspace as its output location and changes source only. It is outside the
  governed release transitions below.
- **Vendor inspection or authoring**: `rawr agent plugins vendors status` and
  `rawr agent plugins vendors update` take exact content-workspace repository
  coordinates. Update also takes the explicitly selected vendor-source ids.
- **Candidate check**: `rawr agent plugins check` takes exact content-workspace
  repository, commit, tree, release-input, plugin-root, and target-or-complete-set
  coordinates. It publishes nothing.
- **Immutable build**: `rawr agent plugins build` takes those same exact
  content-workspace coordinates and independently produces immutable artifact
  handles. A separate check result is not an ambient prerequisite.
- **Package**: `rawr agent plugins package` takes one immutable artifact handle,
  an exact format, and an explicit output path. It does not read source.
- **Export**: `rawr agent plugins export` takes one immutable artifact handle,
  exact mode and layout, explicit destinations, and overwrite policy. Each
  destination remains governed by its own ledger.
- **Provider test**: `rawr agent plugins test` takes immutable targeted-release
  handles or one immutable complete-set handle, an evaluation profile, and
  explicit provider homes and executables.
- **Provider convergence or inspection**: `rawr agent plugins sync` and
  `rawr agent plugins status` take the governed channel locator and explicit
  provider homes. They do not rediscover a release set from source. Closed-set
  sync retires omitted lifecycle-owned members; there is no separate
  receipt-owned retirement command.
- **Current-main record**: `rawr agent plugins check --mode
  current-main-record` encodes or validates the one reviewed v2 record. It
  returns canonical bytes but does not write the content repository.
- **Current-main selection**: `rawr agent plugins check --mode
  current-main-selection` takes one explicit content-workspace locator and
  expected repository identity. It resolves the reviewed v2 record from stable
  canonical Git without hosted approval or promotion replay.
- **Undo**: `rawr agent plugins undo` uses only the controller-owned managed-export
  capsule and replays only export-destination actions. It accepts no provider
  executable or provider-home authority and never replays native provider state.

Within governed lifecycle operations, content-workspace bytes are admissible
only to vendor, check, build, and current-main selection branches. Record
encode/validate is pure and takes no workspace port. Package, export, test,
provider-state, and undo branches must bind their own owner-specific authority.

## Acceptance

The selected branch settles only when its exact input and output identities,
owner receipts or ledgers, state-transition proof, and any required repeated
convergence proof pass. Unselected branches do not run and need no synthetic
`N/A` execution.

## Guardrails

- Do not edit provider homes, export destinations, registries, or caches as preparation.
- Do not infer a release set by scanning ambient workspaces.
- Do not use package/export as a fallback for native provider convergence.
- Do not use app, web, or runtime composition to bridge lifecycle owners.
- Do not add aliases or compatibility commands for retired mixed lifecycle paths.
