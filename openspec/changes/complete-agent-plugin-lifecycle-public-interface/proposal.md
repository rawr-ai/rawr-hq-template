## Why

RAWR needs one normally installed CLI and one bounded desired-state reconciler
for curated agent plugins. It does not need a private CLI package manager,
runtime selector, retained content-addressed application store, per-file runtime
attestation envelope, or reconstructed Oclif extension manager.

The previous implementation made those mechanisms self-authorizing by wiring
later behavior to their identities. [[authority-amendment]] rejects that model.
This continuation removes the machinery, restores direct Oclif and Nx ownership,
and keeps the lifecycle behavior that solves the actual product problem.

## What Changes

- Make `@rawr/cli` an ordinary Oclif application for development and release.
- Restore `@oclif/plugin-plugins` as the direct owner of `rawr plugins`.
- Add Nx project targets for build, generated Oclif manifests, and packaging;
  use top-level Nx Release configuration for version/changelog/publication of
  the CLI's actual runtime closure. Use a registry-published Oclif package whose
  executable requires installed Bun while Bun-only first-party commands remain;
  adopt Oclif standalone archives only after Node compatibility is proven.
- Delete the custom controller builder, archive format, release store, selector,
  launcher, installer, per-file runtime envelope, controller diagnostics, and
  release workflow.
- Delete the custom Oclif extension bootstrap and local command wrappers.
- Retain one oRPC agent-plugin lifecycle service behind
  `rawr agent plugins`; simplify it to closed release membership, unique skill
  ownership, selected provider-visible content from exact selected Git objects,
  native inspection/reconciliation, and justified owner-local authoring/test
  capabilities.
- Delete the persistent agent release/set repository, projection store,
  publication/retention machinery, and digest-addressed handles. Canonical
  mutation uses the selected Personal Git marketplace through native provider
  commands; local marketplace materialization is disposable-test-only.
- Keep Codex and Claude mutation behind thin native provider adapters. Provider
  homes remain installed-state authority.
- Replace lifecycle-specific source-shape scripts with positive Habitat
  blueprints for services, API plugins, agent routers, the Oclif app, and Oclif
  command plugins. Use Grit only for source relationships.
- Route required lint, typecheck, and Habitat policy through the Nx project graph
  so cacheable work is reused and the candidate revision still receives one
  non-skippable required result.
- Recut Personal RAWR HQ to curated content, provenance, declarative policy and
  evaluation inputs, and its own governed release/channel records. Remove
  Template controller pins, executable copies, and per-file runtime envelopes.
- Prove native Codex and Claude convergence in disposable homes, then approved
  homes, followed by a mutation-free repeat.

## Explicitly Removed

- The “controller” as a CLI distribution or local version-selection concept.
- Custom Oclif plugin installation, registry reconstruction, and official-command
  shadowing.
- Controller digests in Personal lifecycle authority.
- CLI release identity as an input to desired agent-plugin membership.
- App/runtime composition and legacy destination/export work.
- Personal/Template executable equivalence or ancestry.
- HF01/Inngest candidate materialization or release.
- New receipts, ledgers, aggregates, launchers, compatibility readers, and
  adversarial local-tamper machinery.

## Modified Capabilities

- `rawr-cli-distribution`: Nx builds and releases a conventional Oclif CLI
  package; ordinary installation exposes `rawr`.
- `external-cli-extension-boundary`: `@oclif/plugin-plugins` directly owns the
  `rawr plugins` command surface.
- `agent-plugin-command-lifecycle`: `rawr agent plugins` remains the only curated
  lifecycle surface.
- `agent-plugin-channel-selection`: one Personal Git-reviewed record selects one
  closed release input without binding the installed CLI package.
- `agent-provider-projection`: retire the rejected renderer, projection digest,
  and stable materialization protocol in favor of direct native reconciliation.
- `agent-provider-deployment`: explicit Codex and Claude homes converge through
  native commands and live observation.
- `repository-policy`: Habitat owns positive topology and Grit source
  relationships; Nx owns project/task dependency and required-check scheduling.

## Impact

- RAWR HQ-Template loses a large custom distribution and extension-management
  surface while retaining executable code and generic lifecycle tooling.
- Personal RAWR HQ becomes independently content-focused; no Template merge,
  copy, equivalence, or executable pin is introduced.
- Existing controller installations become obsolete local bytes. The corrected
  product does not scan or mutate them after conventional CLI installation is
  verified.
- Inngest remains `HF01_PENDING` and is excluded from this workstream's selected
  Personal release input and every initiative provider mutation while pending.
- The dedicated architecture migration retains ownership of application/runtime
  composition and destination realization.

## Related

- Controlling amendment: [[authority-amendment]].
- Architecture: [[design]].
- Execution: [[tasks]].
- Durable status and verification: [[README]].
