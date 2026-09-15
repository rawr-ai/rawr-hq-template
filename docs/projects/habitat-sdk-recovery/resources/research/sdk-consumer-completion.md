> **Preserved evidence, not current authority.** September 15 Rawr consumer/tooling evidence.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#consumer-evidence) and [current assessment](../../assessment.md).

# Habitat Consumer Completion Audit

Date: 2026-09-15. Read-only repository investigation; no implementation performed.

## Conclusion

The consumer evidence supports bounded SDK packaging repair and concrete
consumer-tooling completion, not replacement of the underlying runtime. Two
previous observations were freshly reproduced against the installed 0.6.0
artifacts without changing files: public declaration portability failure and
same-version oRPC module-realm divergence.

Source checkout: Habitat `55ce5a7fb`, with the supplied accepted-main baseline
`29365b34c`. The inspected diff after that baseline contains Fluree research and
documentation artifacts, not changes to the SDK or CLI implementation examined
here. Rawr consumes released Habitat 0.6.0. Current source, installed artifacts,
and historical consumer receipts are distinguished below.

## 1. Public Declaration Portability

**Disposition: freshly reproduced SDK producer defect.**

A read-only TypeScript compiler-API probe loaded Rawr's topic build configuration
with `emitDeclarationOnly: true`. Its compiler host modified source text only in
memory and discarded all emitted output. Baseline diagnostics were empty.
Removing only `listCommand: ListCommand` produced TS2742 naming the installed
SDK's private bundled chunk `@habitat-ai/sdk/dist/app-DcZnHLWD.js`. Independently
removing the explicit command-tuple annotation produced the same TS2742.
The first mutation also left an unused type alias diagnostic, which does not
account for the independent declaration-portability error.

Evidence:

- Consumer list command annotations (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/plugins/cli/topics/sources/src/commands/list.ts:13`).
- Consumer explicit command tuple and topic return type (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/plugins/cli/topics/sources/src/index.ts:10`).
- [SDK createOclifCommand](../../../../../packages/core/sdk/src/plugins/cli/oclif/index.ts#L64), whose result is inferred from the [defineCommand call](../../../../../packages/core/sdk/src/plugins/cli/oclif/index.ts#L109).
- Historical consumer reproduction and unsuccessful simplifications (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/WORKSTREAM.md:215`).

**Owner:** SDK public return types and declaration bundling. Preserve exact
input, client, result and command-tuple types through public names. Do not require
a Rawr framework, private imports, casts or widened declarations as the solution.

**Missing producer acceptance:** install the packed SDK into a separate
multi-package consumer, export inferred service-using commands and a topic
factory, emit declarations, and typecheck a further package importing those
declarations. No source aliases or private bundled paths may be required.

This is distinct from the private executable's unnecessary declaration emission.
Rawr already corrected that consumer configuration at
apps/rawr/tsconfig.build.json (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/apps/rawr/tsconfig.build.json:4`).
The consumer record (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/WORKSTREAM.md:209`)
explains the removed app/process/profile annotations. Do not count this corrected
choice as a remaining SDK defect.

## 2. Managed Effect Dependency Closure

**Disposition: freshly reproduced integration defect; successful consumer repair
is present.**

Fresh `createRequire` and realpath inspection showed:

| Consumer owner | oRPC server/contract versions | Same SDK realm | OTel API |
| --- | --- | --- | --- |
| source-library | beta.32 | Yes | 1.9.0 in both |
| session-intelligence | beta.32 | No | Consumer 1.9.1; SDK 1.9.0 |

In a fresh Bun subprocess, importing the public SDK Effect bootstrap and then
loading each owner's native `@orpc/server` produced `typeof os.effect ===
"function"` for source-library and `"undefined"` for session-intelligence.
No repository, dependency or lockfile was changed for this probe.

This does not establish a present functional bug in the ordinary-client
session-intelligence service. It demonstrates why matching top-level vendor
versions cannot qualify its subsequent managed Effect adoption.

Evidence:

- [SDK explicit OTel dependency](../../../../../packages/core/sdk/package.json#L210), [oRPC contract pin](../../../../../packages/core/sdk/package.json#L224), and [server pin](../../../../../packages/core/sdk/package.json#L228).
- [Public SDK bootstrap delegates to native extension](../../../../../packages/core/sdk/src/plugins/server/effect/index.ts#L1).
- [Service generator's dependency pins](../../../../../apps/habitat/src/generators/service.ts#L27) and [manifest construction](../../../../../apps/habitat/src/generators/service.ts#L144).
- Successful source-library dependency closure (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/services/source-library/package.json:27`).
- Historical failure, root cause, repair and runtime receipts (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/WORKSTREAM.md:228`).

**Owner:** coordinated SDK package compatibility contract and CLI managed-service
generator/migration. Supply or enforce the complete supported peer closure and
diagnose split native realms rather than relying on equal version strings.

**Important acceptance qualification:** Habitat already has installed-package
realpath assertions. The fixture first supplements the generated service with
direct experimental-effect and Effect dependencies at
[installed-package.test.ts:4467](../../../../../apps/habitat/test/installed-package.test.ts#L4467),
then checks SDK/service/extension realpath identity at
[installed-package.test.ts:4491](../../../../../apps/habitat/test/installed-package.test.ts#L4491).
The missing case is explicit optional-peer-context divergence in a Bun isolated
multi-workspace consumer, not the total absence of realm checks. Rawr's receipt
also records that merely adding experimental-effect did not solve its problem.

Acceptance should exercise generated managed service composition under divergent
optional peer resolution, prove the supported closure is established or clearly
refused, and execute actual native `.effect` success/failure through the managed
CLI. Historical lifecycle receipts were read, not rerun in this audit.

## 3. Workspace Migration Completeness

**Disposition: historical consumer failure with a source-confirmed acceptance
coverage gap. No mutating migration was rerun.**

Rawr's native upgrade updated only the root CLI dependency. Six nested Habitat
pins and six direct oRPC pins required manual alignment before the uncached
consumer checks passed. The upgrade receipt (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/WORKSTREAM.md:121`)
records this and the subsequent frozen-install/idempotence checks.

Evidence:

- [CLI Nx package-group metadata](../../../../../apps/habitat/package.json#L34) groups SDK with CLI.
- [Migration collection](../../../../../apps/habitat/migrations.json#L3) contains only the 0.5.7 foundation migration.
- [Current-foundation migration acceptance](../../../../../apps/habitat/test/installed-package.test.ts#L1130) creates root-only dependency manifests; it does not prove upgrade of existing service/topic workspace manifests.

**Owner:** CLI Nx migration and release compatibility policy. Traverse admitted
workspaces, upgrade applicable Habitat pins, and reconcile or explicitly refuse
incompatible coupled vendor dependencies without upgrading unrelated product
dependencies.

**Missing acceptance:** a previous-release multi-service/topic consumer with
nested dependencies, complete uncached build/check/runtime verification, frozen
installation, and a second-run no-op. Root package-pair migration and install
success are necessary but insufficient evidence.

## 4. Consumer Authoring Generators

**Disposition: source-confirmed missing generator coverage, not an SDK runtime
failure.**

The [generator collection](../../../../../apps/habitat/generators.json#L3)
advertises preset, init, remove-hook, service, cli-command and cli-extension.
There is no advertised app/resource/provider/topic generator. The
[command generator](../../../../../apps/habitat/src/generators/cli-command.ts#L29)
requires root identity `habitat-workspace`, then the exact Habitat app/topic
owners. It is intentionally core-only, not a downstream command generator.

**Crucial distinction:** the current [service template](../../../../../apps/habitat/generators/service/files/habitat.toml.template#L5)
selects service **v3**, not managed service v4. Rawr successfully generated and
checked the v3 shell, then manually advanced the declaration and managed
assembly. Its design (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/DESIGN.md:52`)
and scaffold receipt (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/openspec/changes/build-source-library-cli/WORKSTREAM.md:228`)
preserve this sequence.

**Owner:** CLI generators/preset and applicable generic blueprints. Provide a
coherent downstream managed-service/topic/app/resource/provider assembly path.
Keep ordinary external Oclif extension generation a separate story.

**Missing acceptance:** a genuinely product-named consumer fixture with managed
service-using commands, resource/provider selection and an executable app,
passing declaration emission, policy, build and actual invocation. The existing
[qualified command-generator matrix](../../../../../apps/habitat/test/support/qualified-generator-matrix.ts#L44)
deliberately creates Habitat-core identity, so its success does not establish
downstream support. Do not spoof that identity as a workaround.

## 5. Agent Guardrail Coverage

**Disposition: source-confirmed limited feedback, not complete enforcement.**

The [hook command](../../../../../plugins/cli/topics/foundation/src/commands/hook.ts#L21)
selects only `{ runner: "habitat" }`, excluding Grit source rules, and
[exits 1 on failure](../../../../../plugins/cli/topics/foundation/src/commands/hook.ts#L27).
The contribution is [Stop-only](../../../../../apps/habitat/src/nx/initialization.ts#L269)
and explicitly reports [structural-law checking](../../../../../apps/habitat/src/nx-generators.ts#L38).

**Owner:** CLI hook projection/policy selection and host integration, not SDK.
Do not silently reinterpret the existing structural-feedback contract as a full
repository gate. Decide the intended rule selection and blocking behavior, then
test a structure violation and a source-rule violation through the actual host.

**Limits:** this sub-audit did not independently verify Codex's interpretation of
exit 1 or the projectless parent thread's hook-loading state. Use the parent
investigation's host evidence for those claims. No claim that reading a hook
configuration proves its execution is made here.

## 6. Husky Worktree Activation

**Disposition: freshly observed consumer/worktree setup defect; no demonstrated
upstream initializer omission.**

Rawr's root package (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/package.json:32`)
declares `prepare: "husky"` and exact Husky 9.1.7. Its
tracked pre-push policy (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/.husky/pre-push:1`)
runs the repository check. Fresh `git config --show-origin --get core.hooksPath`
resolves `.husky/_` from the shared primary repository Git config, but fresh
directory inspection finds no `.husky/_` dispatcher in this retained worktree.

Habitat already installs/configures Husky and explicitly activates it, including
on repeated init with unchanged package data:
[initializer](../../../../../apps/habitat/src/generators/init.ts#L24).

**Owner:** Rawr worktree/bootstrap procedure. An upstream linked-worktree
activation diagnostic and regression test would strengthen qualification. Do not
claim local pre-push enforcement from tracked policy plus `core.hooksPath` alone.
No hook was installed or repaired during this audit.

## Scope And State

Rawr owns product composition, source-domain behavior, hosted workflow and branch
protection, and product follow-ups. Its
repository router (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-rawr-source-library/AGENTS.md:33`)
explicitly disclaims configured hosted enforcement. Marketplace content has no
repair ownership in these findings.

Nx project discovery and relevant routers/skills were read before source
inspection. No source, manifest, dependency, lockfile or configuration was edited.
Final Git inspection matched the initial state: Habitat retained only its
pre-existing untracked `.codex/config.toml`; Rawr remained clean. This report is
the sole persisted output from this sub-audit.
