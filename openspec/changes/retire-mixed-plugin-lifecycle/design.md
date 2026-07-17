## Context

C1 installed one immutable Template controller and isolated native Oclif state to external extensions. C2 added immutable curated release, build, package, export, and controller-capsule owners. C3 added inert native provider and promotion owners. C4 removed legacy web-membership, mounting, and state-registry paths and retained only three qualified creators. The remaining mixed aggregate is migration substrate that must now disappear as the qualified lifecycle becomes reachable.

The accepted packet objects are provenance only. Template starts from its own clean `main`; personal code, history, runtime files, and OpenSpec files are not imported. A personal checkout is only an explicit versioned content/record locator.

## Goals / Non-Goals

**Goals:**

- expose one exact curated agent lifecycle command family from the installed controller;
- keep every command's parser and effect boundary closed and owner-local;
- delete the mixed command/package/service/HQ Ops model and every active semantic dependency on it;
- preserve external Oclif, immutable artifacts, managed export, deterministic packaging, native provider convergence, promotion verification, and bounded undo through their qualified owners;
- make valid read-only and converged outcomes perform zero writes.

**Non-goals:**

- app composition, web plugin mounting, runtime compilation/provisioning/mounting, or replacement platform architecture;
- personal content normalization, lifecycle record authoring, acceptance issuance, current-main promotion, or canonical live provider/export mutation;
- cross-home coordination, operation history, global uniqueness state, PKI, compatibility aliases, or adversarial installed-state security.

## Decisions

### The public ontology is exact and closed

Bare `rawr plugins` exposes exactly `install|link|uninstall|list|inspect|update|reset`. Curated agent lifecycle exists only below `rawr agent plugins`. Removed IDs, aliases, hidden aliases, topics, flags, environment switches, and help rows reject at discovery or parsing rather than forwarding.

Command files parse into discriminated typed procedure requests or the closed controller-owned undo request. They do not build optional-field bags or recover old flags. Status exits `0` only when every selected target is `CONVERGED`, exits `1` for a valid observed non-converged classification, and exits `2` for invalid input or authority binding. Structured output retains the underlying closed result.

### One oRPC service owns the lifecycle domain

C2-C3 incorrectly treated distinct state repositories as distinct service domains. C5 replaces the five peer packages with one `@rawr/agent-plugin-lifecycle` service following the `services/session-intelligence` shell. Its internal `releases`, `vendors`, `packaging`, `exports`, `providers`, and `governance` modules preserve qualified state authorities without creating peer service identities. The release support package is absorbed into service-owned shared domain types and deleted.

The CLI binds concrete controller runtime ports once and invokes one typed local service procedure per service-backed lifecycle transition. Command code may adapt values but may not import module applications, resolve lifecycle prerequisites, or sequence cross-module transactions. `rawr agent plugins create` remains the settled C4 source-authoring command. `rawr agent plugins undo` invokes the existing controller-owned capsule application; undo storage and replay do not move into the service.

The controller data layout derives only from the verified selected-controller context. Content and record repositories require explicit absolute locators and fixed Git object reads. Provider executables and Git use explicit absolute configured paths; there is no PATH, cwd, personal-code, or worktree fallback.

### Artifact handles are typed, not paths

The CLI accepts only canonical domain-qualified handles:

```text
release:<rd1_64-lowercase-hex>:<ad1_64-lowercase-hex>
release-set:<rs1_64-lowercase-hex>
```

Raw digests, JSON, filesystem paths, uppercase encodings, or surplus fields reject before artifact or destination access.

### Vendor management is repository authoring, not deployment

The `vendors` module derives declarations from explicit canonical release input. `vendors status` reads declared upstream and admitted lock/provenance state and never authors. `vendors update` handles only declared tracked sources, verifies upstream identity/ref/layout and local drift, then authors reviewable content, provenance, lock, and release-input changes. Held sources reject before fetch or materialization. The command never builds, packages, exports, accepts, promotes, deploys, or mutates a provider.

Any private fetch workspace is created below one operation-owned temporary parent and cleanup revalidates the exact parent, child prefix, realpath containment, captured identity, and directory type before recursive removal. There is no public generic Git runner or deletion wrapper.

### Promotion verification remains read-only

The `governance` module performs exact Git-object and hosted-approval observation internally and exposes one validate-and-attest procedure. The CLI cannot sequence validation and attestation, supply approval JSON, or authorize itself. Missing exact hosted approval returns `BLOCKED_ACCEPTANCE_AUTHORITY`; no repository record or provider state is written.

### The legacy model is deleted rather than shimmed

The old plugin command package, sync services, Node adapter package, HQ Ops catalog/install/lifecycle modules, source registries, install repair planners, provider toggles, generic projection fallback, toolkit provider/composition aliases, workspace undo, and synthetic toolkit `tools` distribution owner are deleted. Active docs, skills, hooks, scripts, package metadata, tests, and guards are rewritten to the qualified owner model. No deprecated command forwards to the new implementation.

### Runtime ports are explicit and C5 does not realize apps

The service uses the repository-admitted `@rawr/hq-sdk` oRPC primitive. Construction context contains abstract resource ports plus verified controller identity; authority-selecting content workspaces, provider homes, destinations, outputs, and Git refs remain explicit procedure inputs. Absolute Git/provider executable paths are explicit validated controller-projection binding inputs used to construct those ports; they are never discovered from PATH, cwd, a content workspace, or personal code. Concrete filesystem, Git, archive, and native-provider implementations live under capability-oriented `resources/<capability>/providers/<provider>` projects and use Effect Platform at that mechanical boundary. The CLI projection only selects explicit providers, performs controller-authority preflight, and attaches the provisioned capabilities through exact service binding facades. The lifecycle service remains native oRPC and does not add an effect-oRPC terminal; this temporary CLI attachment does not realize the future app/runtime system.

The future platform owns:

```text
defineApp(...) -> SDK derivation -> runtime compiler -> process runtime -> adapters -> harnesses -> RuntimeCatalog
```

C5 neither implements nor calls that chain. It retains no web enablement registry and creates no app selection, mounting, runtime observation, or compatibility layer. Lifecycle service binding and controller-undo projection are controller wiring, not app composition.

## Risks / Trade-offs

- **Deleting the aggregate breaks broad tests and docs.** Replace only tests and guidance that express retained qualified behavior; delete tests whose assertion is the old model.
- **Thin commands can grow into orchestration.** Enforce one typed procedure call per command and keep orchestration inside the owning service module.
- **One service can become a junk drawer.** Ratchet the exact module inventory, keep code module-local by default, and export only boundary surfaces.
- **Vendor update can expand into a supply-chain system.** Keep it to declared Git sources, exact provenance/lock updates, reviewable repository bytes, and guarded operation-local temporary cleanup.
- **Production promotion bindings depend on hosted availability.** Classify unavailable authority as blocked; never add local approval fallback.
- **Future architecture work overlaps terminology.** Preserve legacy absence and cite the canonical architecture; make no partial runtime implementation.

## Migration Plan

1. Land this behavior record in the C5 source change before runtime implementation.
2. Consolidate the five peer packages into the one oRPC service and preserve their behavior tests under internal modules.
3. Add strict handle/content/home/Git parsing and typed command projections with behavior tests.
4. Add the smallest vendor and promotion production bindings required by the public ontology.
5. Delete all mixed owners and semantic residue, then repair package graph, hooks, docs, tests, and guards.
6. Run exact command discovery, mutation-port, state-transition, semantic-inventory, affected-Nx, and disposable installed-controller proof.
7. Resolve every standing-review P1/P2 finding, land through Graphite, archive the changeset, and drain the branch/worktree before C6.

Rollback before public activation is a source revert. After activation, rollback is still a complete source/controller release revert; no legacy command, aggregate, alias, or compatibility package remains as a hot fallback.

## Open Questions

None. If the lifecycle cannot remain one service without collapsing state authorities, if provider/promotion authority requires caller-supplied approval, or if lifecycle activation requires app/runtime composition, C5 stops at a redesign trigger rather than creating the wrong owner.
