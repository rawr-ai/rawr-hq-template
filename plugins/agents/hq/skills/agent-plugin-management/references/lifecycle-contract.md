# Curated Agent-Plugin Lifecycle Contract

> **Canonical scope**: governed content and release records in an independent
> content repository, operated by the Template-owned CLI through explicit Git,
> package-output, and provider interfaces.
>
> **Related**: [[workflow.md]] and
> [[../../../workflows/lifecycle-agent-plugin.md]].

## Authority

- The content repository owns curated source, vendor provenance, declarative
  policy/evaluation inputs, and its governed release/channel records.
- RAWR HQ-Template owns the CLI, lifecycle service, provider adapters,
  schemas, tooling, and generic validation.
- Repository path locates content. It does not create code ancestry, CLI
  installation identity, package-output identity, or provider authority.
- External Oclif extension state belongs only to `rawr plugins ...` and is
  outside this contract.

## Operation Contracts

Select exactly one operation. Its listed authority inputs are sufficient; no
branch silently runs `check`, cleans a checkout, or starts another operation.

- **Source authoring**: `rawr agent plugins create` takes an explicit content
  workspace as its output location and changes source only. It is outside the
  governed release transitions below.
- **Vendor inspection or authoring**: `rawr agent plugins status vendors` and
  `rawr agent plugins update vendors` take exact content-workspace repository
  coordinates. Update also takes the explicitly selected vendor-source ids.
- **Candidate check**: `rawr agent plugins check` takes exact content-workspace
  repository, commit, tree, release-input, plugin-root, and target-or-complete-set
  coordinates. It publishes nothing.
- **Package**: `rawr agent plugins package` takes exact content-workspace Git
  coordinates, one targeted or complete-set selection, an exact format, and an
  explicit output path. It derives selected bytes in memory and writes only the
  requested package output.
- **Provider test**: `rawr agent plugins test` takes exact content-workspace Git
  coordinates, one targeted or complete-set selection, an evaluation profile,
  and explicit disposable provider homes and executables.
- **Provider convergence or inspection**: `rawr agent plugins sync` and
  `rawr agent plugins status` take the governed channel locator and explicit
  provider homes. The reviewed record selects exact Git content; the service
  derives the complete set in memory. Closed-set sync retires omitted
  lifecycle-owned members from live native state.
- **Current-main record**: `rawr agent plugins check --mode
  current-main-record` encodes or validates the one reviewed v3 record. It
  returns canonical bytes but does not write the content repository.
- **Current-main selection**: `rawr agent plugins check --mode
  current-main-selection` takes one explicit content-workspace locator and
  expected repository identity. It resolves the reviewed v3 record from stable
  canonical Git without hosted approval or promotion replay.
Within governed lifecycle operations, selected Git bytes are admissible only to
vendor, check, package, test, current-main selection, and provider branches.
Record encode/validate is pure and takes no workspace port. Every branch binds
its own owner-specific inputs; none consumes a retained lifecycle artifact.

## Acceptance

The selected branch settles only when its exact input and output identities,
owner state, state-transition proof, and any required repeated
convergence proof pass. Unselected branches do not run and need no synthetic
`N/A` execution.

## Guardrails

- Do not edit provider homes, registries, or caches as preparation.
- Do not infer a release set by scanning ambient workspaces.
- Do not use package output as a fallback for native provider convergence.
- Do not use app, web, or runtime composition to bridge lifecycle owners.
- Do not add aliases or compatibility commands for retired mixed lifecycle paths.
