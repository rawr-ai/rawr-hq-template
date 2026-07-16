# Repository Separation And Artifact Workflows

This document is canonical and normative for interactions between
`RAWR HQ-Template` and personal `RAWR HQ`.

## Repository Authorities

`RAWR HQ-Template` owns executable controller code, official commands, provider
adapters, generic lifecycle services, schemas/tooling implementations, and generic
validators.

Personal `RAWR HQ` owns curated agent-plugin source/content, vendor provenance,
declarative policy/evaluation inputs, and its own governed acceptance, release, and
channel records.

Each repository owns its own Git history, `main`, Graphite state, worktrees, hooks,
configuration, and process records.

## Forbidden Relationships

- Do not merge, rebase, cherry-pick, transplant, or establish ancestry between the repositories.
- Do not copy, fork, vendor, or manually duplicate Template runtime code in personal.
- Do not preserve Template-managed executable paths in personal through a guard,
  manifest, tree-equivalence check, or compatibility layer.
- Do not use a checkout path as controller, artifact, channel, ledger, receipt,
  release, provider, or export identity.
- Do not make upstream synchronization a product or repository-process dependency.

## Allowed Interface

Template may operate on personal content only through an explicit versioned
data/artifact interface. A complete binding names:

- schema or protocol ID and version;
- installed tool/controller release digest;
- immutable content or release artifact digest;
- curated release-set digest where applicable;
- governed record digests;
- provider/export destination identity when mutation is requested.

Personal Git commits and trees may be retained as audit provenance. They do not
replace any interface field above.

## Template Publication

1. Implement and verify the generic behavior in Template.
2. Publish the versioned schema/protocol and immutable tool or controller artifact.
3. Record its digest and compatibility declaration.
4. Land through Template's own Graphite stack and canonical `main`.

No personal checkout participates in controller build, selection, or release identity.

## Personal Acceptance

1. Start from clean personal `main` and its own repository process record.
2. Author or update only curated content and governed content records.
3. Invoke an externally installed Template-owned tool at the exact accepted
   interface version; do not vendor the tool.
4. Bind the produced/accepted artifact and record digests.
5. Land through personal's own Graphite stack and canonical `main`.

Repository location may be supplied as a content-workspace locator. The tool must
verify content identity from Git/data inputs rather than treating the path as authority.

## Operational Acceptance

Cross-repository acceptance is a protocol compatibility check, not a Git integration:

1. verify each repository is clean on its own canonical `main`;
2. verify the installed controller release and interface versions;
3. verify personal content and governed records against that exact interface;
4. reconcile only the explicitly named provider home or export destination;
5. repeat the operation and prove inspection may occur but no state changes;
6. verify no executable mirror, workspace link, compatibility alias, or lifecycle
   override connects the repositories.

## Command Boundaries

- `rawr plugins ...` owns external Oclif extension operations.
- `rawr agent plugins ...` owns curated agent-plugin lifecycle operations.
- Provider/export commands mutate only the named destination through its declared owner.
- App composition consumes declared outputs and owns no lifecycle state.

## Repository Promotion

Promote repositories independently. A Template release may become a prerequisite
for validating a personal interface version, but it is never merged into personal.
A personal content release may become an input to Template tooling, but personal
source is never imported as executable controller code.
