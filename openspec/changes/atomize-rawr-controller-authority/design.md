## Context

Template `main` currently runs `apps/cli/src/index.ts` directly from a checkout. The global installer replaces `~/.bun/bin/rawr` with a symlink to that checkout, an owner file selects another checkout path, and post-checkout hooks refresh the link. Official command packages are split between static `apps/cli/package.json#oclif.plugins` dependencies and mutable user links; `@rawr/plugin-session-tools` and `@rawr/plugin-chatgpt-corpus` are absent from the static closure, while the external fixture `@rawr/plugin-hello` has the same `rawr.kind=toolkit` marker as official modules. Stock Oclif loads user plugins and hooks before command dispatch, so a missing, malformed, or colliding user entry can shadow an official package or prevent recovery commands from starting.

This design implements C1 only. Its governing order is the landed repository-separation amendment, this change's accepted `AUTHORITY_SCOPE_CORRECTION.md`, the accepted normative proposal, the workstream's C1/B01-B03/B32 and I01-I02/I08/I17-I18 rows, then the remaining execution record. Current source is migration evidence, not target authority.

### Corrected repository boundary

RAWR HQ-Template and personal RAWR HQ are independent. The original packet commit/tree are design provenance, and the later amendment is the higher-priority repository-boundary authority. C1 imports no personal source or history, creates no personal runtime entrypoint, and uses no merge, remote, workspace link, mirrored path, or tree-equivalence check. A future `--content-workspace` value is data/Git input to a versioned Template interface only and has no role in controller startup.

### Current command-module disposition

| Current module | C1 disposition |
| --- | --- |
| `@rawr/cli`, `@oclif/plugin-help` | atomic controller members |
| `@rawr/plugin-devops`, `@rawr/plugin-hyperresearch`, `@rawr/plugin-session-tools`, `@rawr/plugin-chatgpt-corpus` | atomic controller members |
| `@rawr/plugin-plugins` | interim atomic member; C5 deletes its mixed lifecycle ownership |
| `@rawr/plugin-hello` | genuine external-extension fixture; never a controller member |
| `@oclif/plugin-plugins` | atomic controller member and sole external-extension mutation owner behind Template projections through its public `commands` export; never user-linked or deep-imported |

Every Template CLI command package must be explicitly classified. `rawr.kind`, directory location, workspace discovery, and current user links are not membership authority.

## Goals / Non-Goals

**Goals:**

- Materialize one self-contained Template controller release whose payload-bound release entry and complete official command-module closure have one manifest and digest identity.
- Select a verified release atomically below the stable Template data root, with no worktree path in runtime identity or operational state.
- Keep the native Oclif user registry as the only external-extension state owner while preventing it from loading an unvalidated extension or shadowing controller members.
- Preserve install, link, uninstall, list, inspect, update, and reset for genuine external extensions, including recovery when registry entries are broken.
- Make controller and extension failures observable and read-only through complete global diagnostics.
- Make the development and acceptance path exercise a materialized controller fixture instead of treating source execution as a second controller.

**Non-Goals:**

- Agent content discovery, releases, provider deployment, export, packaging, promotion, app composition, or personal lifecycle records.
- C5 deletion of `@rawr/plugin-plugins`, `agent-config-sync`, mixed lifecycle commands, or compatibility vocabulary except the C1-owned official-link/relink behavior that directly violates controller closure.
- A new extension registry, global identity database, signature system, PKI, operation history, or personal-repository integration mechanism.
- Protected Inngest materialization or subject changes to the accepted oRPC/effect-oRPC lane.
- PKI, supply-chain attestation, or resistance to a writer who controls the complete installed controller and selector.

## Decisions

### 1. An explicit classification file is controller membership authority

The Template controller owns a checked-in, schema-validated classification of every CLI package. Each row is either `controller-member` or `external-fixture`; controller rows name package identity and expected command-manifest input. A guard fails when a Template CLI package is unclassified, duplicated, or appears in both classes.

The release builder resolves the transitive Nx/workspace dependency closure only after this explicit root set is fixed. The graph locates required bytes; it never decides which command packages are official. This preserves modular source projects without allowing directory scans or mutable links to create controller membership.

**Rejected:** deriving membership from `plugins/cli/**`, `rawr.kind`, the current Oclif registry, or every workspace package. Each admits `hello`, misses supported modules, or makes a checkout the next invocation's authority.

### 2. Controller identity is a non-circular digest of the complete runtime payload

Pure controller release values live in `packages/controller-release`, never in the CLI app. That package owns branded release-relative paths and digests, the digest-free `ControllerPayloadManifest`, canonical serialization, the branded `ControllerDigest`, the `ControllerReleaseEnvelope`, and pure payload verification. It imports no filesystem, process/environment, network, Git, app, plugin, service, or ambient clock/random APIs.

The builder uses the explicit member set and Nx graph to stage only the CLI, official modules, their transitive runtime project roots, exact dependency lock data, built command output, bundled Bun, and the release entry. It must not snapshot the whole repository. After frozen installation, it enumerates every runtime file and symlink below the release payload root. Each manifest row binds relative path, entry kind, mode, byte digest for files, and relative target for links. Links must resolve inside the same release payload. Regular files must have independent storage authority: materialization copies or reflinks them with copy-on-write semantics, and verification rejects any file whose link count is greater than one. No mutable shared dependency store or shared inode is permitted.

The digest-free canonical `ControllerPayloadManifest` contains:

- schema version;
- audit-only Template source revision;
- platform, architecture, and bundled Bun relative path, byte digest, version, and revision as release inventory and runtime provenance;
- release-entry relative path and digest;
- every official member's package ID, version, relative root, payload digest, command IDs, topics, aliases, hidden aliases, and hooks;
- exact dependency-lock digest;
- build-tool/interface versions needed to verify the artifact;
- the complete sorted runtime path/link/mode/digest inventory, including installed third-party dependency bytes.

Canonical serialization of that digest-free value is hashed once to produce `ControllerDigest`. A separate `ControllerReleaseEnvelope` stores the payload manifest plus claimed digest; verification recomputes the digest before trusting either. The envelope is metadata, never an executable dependency and never part of its own digest preimage. The release directory name is the verified digest.

Manifest paths are release-relative. Absolute source, verifier, content, or worktree paths are forbidden. Every executable dependency byte is inside and bound to the selected release; lock data alone is not treated as runtime-byte proof.

**Rejected:** a full repository copy, a manifest-only artifact with workspace symlinks, or a single checkout symlink. The first can package unrelated/protected bytes; the others keep source paths load-bearing.

### 3. A bounded launcher selects one stable controller

The controller data root resolves from `RAWR_DATA_DIR`, otherwise the platform XDG data convention. Releases live at `controller/releases/<controller-digest>/`. Selection is the regular text file `controller/current` containing exactly one lowercase digest plus newline. The activation adapter writes it by temp-file, flush, and atomic rename only after the candidate release passes envelope, complete payload, dependency, command-surface, and clean-start verification. The selector is the sole authority commit. A matching selector is not by itself full convergence: the requested activation state also includes the verified stable launcher and any requested global alias. Selector-equal auxiliary drift is settlement-required and may repair only those auxiliaries without rewriting the selector or rerunning the clean-start probe. Only exact full-state convergence performs reads only.

The Bun-global `rawr` path targets one stable Template-owned POSIX launcher at `controller/bin/rawr`, never a checkout or selected-release alias. The launcher reads `current` exactly once, validates its closed syntax, derives the digest-qualified release path, captures operator cwd/home as overwritten data values, scrubs `BUN_OPTIONS`, `NODE_OPTIONS`, `NODE_PATH`, Bun/Node preload/config and workspace/module-resolution variables, and `exec`s `runtime/bun` with `app/rawr.mjs`, explicit null config/HOME/XDG, `--no-env-file`, `--no-install`, and controller cwd. It contains no command parsing, release authentication, repair, source lookup, alternate runtime, or fallback.

The payload-bound release entry at `app/rawr.mjs` derives `{ digest, releaseRoot, envelope, operatorCwd }` from its own canonical location, verifies the ordinary envelope/payload contract to catch incomplete or mixed artifacts, restores operator cwd/home as command context, and loads controller code only from that release. It never rereads `current`. Concurrent activation therefore starts an invocation entirely on A or entirely on B; no invocation mixes release entry, manifest, dependencies, or commands. Build and activation remain explicit Template scripts outside the supported RAWR command surface, so no supported command rewrites the implementation of its next invocation.

Candidate, probe, alias-preparation, launcher, or selector failures before the selector commit leave the prior selector byte-for-byte intact and publish no newly prepared alias. Because selector authority and a global alias occupy different filesystem locations, rollback after selector commit would introduce another race rather than restore one atomic state. A post-selector alias failure therefore returns an explicitly unhealthy partial-settlement result while retaining the new selector; retry settles only the alias, and the following fully converged invocation is read-only. Source-local `apps/cli/bin/run.js` execution without a materialized release context fails with `CONTROLLER_RELEASE_REQUIRED`; repository tests and development commands use an explicit temporary controller fixture.

**Rejected:** a direct global link to source JavaScript, ambient cwd/global bunfig, inherited preload/env configuration, `global-rawr-owner-path`, checkout transfer, post-checkout relinking, cwd fallback, personal-source delegation, and a recursive launcher trust chain. The first group preserves a supported second controller path; the last solves an excluded attacker problem.

### 4. Startup never gives raw user registry entries directly to Oclif

The root bootstrap reads and verifies the selected controller before constructing Oclif configuration. It loads core controller members from the release manifest and sets Oclif's automatic `userPlugins` loading off. A Template-owned external-extension adapter reads the native Oclif registry as data, validates each candidate's package and static command manifest without importing its command or hook modules, and injects only accepted entries into the runtime configuration. Activation constructs Oclif plugin metadata directly from that exact parsed snapshot; it never calls `Plugin.load`, so Oclif's missing/mismatched-manifest generation fallback is unreachable. Static hook targets and named-export identifiers are preserved exactly. A command loader re-inspects the candidate fingerprint immediately before importing the declared module through Oclif's public manifest loader.

Reserved identities are the complete controller manifest's package IDs, command IDs, topics, aliases, hidden aliases, and hooks. Unknown, malformed, missing, or colliding entries are logically quarantined for that invocation: startup performs no registry mutation, their code and hooks do not load, and diagnostics retain their native registry identity and failure reason.

Core recovery dispatch for `rawr`, `doctor global`, and `plugins list|inspect|uninstall|reset` is constructed without active external hooks. Therefore a throwing or deleted extension cannot block its own inspection/removal. Normal accepted external commands may contribute their declared hooks only after validation.

**Rejected:** a hook-only guard or collision check after stock `run(argv, import.meta.url)`. Oclif has already loaded user packages and hooks at that point.

### 5. Template projects policy; the native Oclif manager owns mutation

Template-owned root commands are the sole user-facing implementation of `plugins install|link|uninstall|list|inspect|update|reset`. The stock command IDs are not independently discovered. Read-only list and inspect project guarded native-registry data so quarantined entries and reasons remain visible without manufacturing active Oclif `Plugin` objects.

Mutating projections have no native-home write port. They classify a request as `delegate-native`, `converged`, or `reject`; only `delegate-native` invokes the matching class from the public `@oclif/plugin-plugins#commands` export. The exported class and its package-internal manager remain the sole writer of registry package JSON, lock data, installed trees, and link entries. The projections add no copied manager, direct registry writer, or deep import of `@oclif/plugin-plugins/lib/**`. Official RAWR modules never enter native user state.

Candidate acquisition and registry mutation are not conflated with activation authority. Install first hashes and statically inspects the canonical source artifact without creating staging output. A matching immutable native install therefore converges read-only. Only a `delegate-native` install copies the already-inspected bytes into private staging; staging rechecks the digest to reject a source change before giving that exact immutable local package reference to the native install command. Link requires a valid static manifest, delegates with dependency installation disabled, and rechecks the linked manifest digest after the native command. Update delegates with package scripts and external hooks disabled, then validates the actual resulting native entries; it does not claim that a preflight observation determines fetched bytes. The authoritative activation decision always reads the actual native registry root and static manifests after mutation and again at the next invocation before external code or hooks load. A changed, malformed, missing, colliding, partial, or post-check-mismatched candidate remains native residue but is logically quarantined and never activated. `reset --reinstall` is rejected because the native class has no per-candidate guard seam.

The pinned native manager identifies local file installs by basename and persists the delegated file URL. To keep that public seam usable without an artifact cache, the one-operation private staging basename binds both the archive SHA-256 and accepted static fingerprint. Distinct artifacts therefore cannot alias through the manager's basename lookup. Native discovery preserves the dependency spec as well as the user entry and requires one dependency for every user entry. If either the entry URL or dependency spec carries a controller content-addressed token, both must carry the same archive and static-fingerprint values; missing or mismatched bindings are quarantined and cannot satisfy install or update convergence. The controller removes the staging tree after dispatch and stores no artifact or shadow record. A repeated local update converges read-only only when the bound native user entry, dependency token, and current guarded static fingerprint agree. An unfamiliar URL remains native-manager update input. This is authority normalization, not verification against the out-of-scope writer who can replace complete installed native state.

The native-manager invocation is a dedicated subprocess launched by exact path through the selected release's bundled Bun, with the same explicit null config, no-env/no-install flags, controller cwd, and scrubbed preload/config/module variables. It uses `userPlugins: false`, disables package scripts, and reserves the manager lifecycle hooks (`plugins:preinstall`, `plugins:postinstall`, and `plugins:postuninstall`) against external declaration. A controller-shipped Bun runtime plugin then installs one closed import rule: built-ins are allowed; a filesystem module is allowed only when both its normalized requested/resolved path and canonical realpath are inside the selected controller release. Every other ESM or CommonJS resolution, including an outside symlink or file URL resolving into controller bytes, is rejected. Static package/manifest reads remain available. The guard also rejects candidate-declared `oclif.plugins` and `oclif.devPlugins`, and the subprocess scrubs ambient module/workspace variables and candidate-specific user/dev plugin discovery.

The subprocess is therefore core-only and manifest-only even though the pinned native link command calls nested `Config.load(path)`: a missing, mismatched, nested, or dynamically generated manifest can fail or leave native residue, but its fallback import cannot execute. If an install/link candidate lacks a valid static manifest, the projection rejects before native dispatch. Actual native state is postvalidated after return, and invalid residue is quarantined. If the pinned Bun import sandbox or public command class cannot enforce this closure, the operation fails without substituting a controller-owned manager. Controller staging is always removed and never becomes registry, rollback, or operation-history authority.

Converged install, link, update, absent uninstall, and empty reset return without native dispatch or writes. Update preparation classifies every user entry separately as proven-local, native-manager input, or rejected. The pinned public `plugins:update` command has no per-entry seam and updates every URL-backed entry in one operation, while proven-local staging has already been deleted by contract. Local-only input therefore converges, native-only input delegates, and a mixed local/native set rejects before dispatch with an actionable stable reason rather than causing the manager to dereference a deleted staging path. Native-manager failure may perform its own rollback or leave candidate residue. Guarded discovery excludes any invalid residue while core list, inspect, doctor, uninstall, and reset remain usable without importing it. No shadow activation/quarantine database is introduced. A throwing accepted extension can fail its normal command or hook, but recovery dispatch excludes external code and remains available.

This split preserves the accepted owner map: Template owns command policy, the manager-process import boundary, guarded read projections, and activation decisions; native Oclif owns external mutation. Mixed-set partial update would require either a native manager with a public per-entry update seam or an explicitly authorized durable content-addressed artifact source. The former is absent from pinned `@oclif/plugin-plugins@5.4.56`; the latter contradicts C1's no-cache/staging-removal boundary. Requiring partial progress for that mixed state is therefore a redesign trigger, not permission to add a second registry, direct writer, copied manager, or artifact cache. If the public command export plus pinned Bun import sandbox cannot otherwise support manifest-only, core-only delegation without copying or deep-importing the manager, C1 stops at its redesign trigger.

### 6. Lifecycle commands lose all Oclif mutation authority in C1

Every install/link/update/uninstall/reset branch, flag, helper, import, export, and positive ratchet reachable from sync/status/converge in the interim mixed package is deleted in C1. Official module discovery/build/link commands are deleted. Only independently named, ontology-valid read-only diagnostics may remain until C5. C5 still owns deletion of the broader mixed command tree, but it is not authority to keep dormant official-relink compatibility code.

An architecture test traps Oclif mutation ports while invoking every lifecycle command and fails on any call. Another guard proves the official command surface is available with an empty user registry.

### 7. Bootstrap has no universal secondary write

The root bootstrap performs controller verification, guarded command configuration, dispatch, flush, and exit handling only. The current universal undo-capsule expiry and best-effort HQ Ops journal writes are removed with their bootstrap imports. They would make recovery and read-only commands mutate unrelated state and load mixed owners before dispatch.

Qualified commands may write only through their declared owner. No generic journal, undo, sync, or HQ Ops application runs before or after every command. Observability that cannot be expressed through a qualified owner is outside C1 rather than preserved as a bootstrap exception.

### 8. `doctor global` reports provenance and never repairs

Global diagnostics report the stable data root, selector state, selected controller digest, launcher path/digest, every official member and verification result, dependency-lock digest, global shim resolution, native external registry path, and active/quarantined extension summaries. The overall result is unhealthy on controller mismatch but the command performs no activation, relinking, registry repair, or source scan.

Checkout-owner and Template/personal equivalence fields are removed. Git revisions remain audit provenance only.

## State Authorities and Dependency Direction

| State | Sole owner | Allowed consumer | Forbidden authority |
| --- | --- | --- | --- |
| controller payload values and verification | pure `@rawr/controller-release` package | builder, launcher, doctor, fixtures | CLI-owned duplicate types, Oclif registry, personal repository |
| controller envelope and release bytes | Template controller builder/activation scripts | launcher, doctor, fixtures | cwd, shared dependency store, personal repository |
| stable launcher | Template installer under the stable data root | selected-digest read and release exec only | controller command, worktree hook, source checkout |
| bundled runtime bytes and provenance | selected controller release plus repository Bun pin | stable launcher and native-manager child | ambient Bun locator, candidate runtime, worktree toolchain |
| current controller selector | Template activation script under stable data root | launcher, doctor | supported RAWR command, checkout hook |
| external extension registry and mutation | native Oclif user data plus `@oclif/plugin-plugins` native manager | Template command projections, guarded adapter, doctor | controller-owned writer, copied/deep-imported manager, lifecycle sync |
| controller classification source | Template repository | release builder and architecture guard | workspace scan, user links |
| future content locator | versioned lifecycle interface | later C2-C6 services | controller selection or command resolution |

The launcher depends on the controller manifest and guarded external adapter. The adapter depends on the controller's reserved-surface read model and native Oclif ports. Neither imports any personal repository module or lifecycle service.

## Risks / Trade-offs

- **Oclif can import linked ESM command modules while discovering metadata** -> require static manifests, disable automatic user loading, and prove a sentinel candidate is never imported before acceptance.
- **A native external operation can fail after starting its own mutation** -> keep mutation with the native manager, quarantine any partial/broken residue at guarded discovery, and prove recovery commands can inspect/remove/reset it without importing candidate code.
- **An incomplete controller artifact can retain hidden workspace or sibling-release links** -> enumerate every runtime file/link/mode/digest, reject any link escaping the selected release, and inject dependency/sibling-store tampering.
- **Explicit membership can become stale** -> classify every Template CLI package and compare generated command discovery with the checked-in controller classification in a permanent guard.
- **The interim mixed lifecycle package remains present through C1** -> make it an immutable controller member but trap all Oclif mutation ports; C5 retains its non-negotiable deletion task.
- **Controller installation is larger than a checkout symlink** -> accept storage cost for immutability and prune only unselected, unreferenced controller releases through a later explicitly owned policy; C1 performs no ambient GC.
- **Bun can execute cwd/global preloads before an entry module** -> use the bounded stable launcher with explicit null config, scrubbed preload variables, disabled env loading/auto-install/cache, and hostile-cwd sentinels; do not grow this into installed-state attacker defense.

## Migration Plan

1. Land this OpenSpec record alone from clean Template `main`; no implementation code is part of the bootstrap commit.
2. Add the pure controller-release package, explicit classification, payload/envelope schemas, release builder, stable selector, and deterministic controller fixture with B01/B02/B32 falsifiers.
3. Install the bounded stable launcher, convert global scripts to materialized-release activation with ambient-config neutralization, and remove checkout-owner/auto-refresh authority.
4. Add sole Template command projections over guarded native state; delegate mutations through the public native Oclif command export in core-only/manifest-only mode, with B03 failure/recovery fixtures and no second mutation owner.
5. Delete official link/relink behavior from interim lifecycle commands and replace positive legacy ratchets.
6. Remove universal bootstrap undo/journal writes, expand global doctor, and run controller, extension, clean-home, source-deletion, type, lint, structural, and affected-Nx proof.
7. Review with TypeScript, testing, and structural-quality standing roles; resolve all P1/P2 findings.
8. Land and drain C1 on Template `main`, archive the completed changeset, and only then open dependent implementation containers.

Rollback before selector replacement deletes only the unselected candidate release. Rollback after selection is an explicit activation of the prior verified controller digest by the external activation script; no RAWR command or Oclif registry entry performs rollback.

## Open Questions

None. If the public native Oclif command export plus the exact-version Bun import sandbox cannot run core-only/manifest-only delegation without copying or deep-importing its manager, if mixed local/native update must make partial progress without a future authorized per-entry native seam or durable artifact contract, or if a self-contained controller requires personal/worktree identity, C1 stops as a redesign trigger rather than weakening these decisions.
