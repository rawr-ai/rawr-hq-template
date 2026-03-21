# Structural Migration Guardrails Proposal, Decisive Revision

**Date**: 2026-03-21  
**Derived from**: `STRUCTURAL-MIGRATION-GUARDRAILS-PROPOSAL.md`  
**Additional grounding**:
- canonical boot specification packet under `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md`
- `.context/research/repo-structural-audit-2026-03-20/proposals/PROPOSAL-V3.md`

---

## Executive Recommendation

Use Nx as the graph, policy, and mechanical-enforcement plane from the first slice.

Do not preserve the current repo's gate packaging or project naming as though they were canonical. The canonical docs already settle the shell:

```text
stable architecture = app -> manifest -> role -> surface
runtime realization = entrypoint -> bootgraph -> process
semantic direction  = packages -> services -> plugins -> apps
```

That means the migration guardrails must do five things immediately:

1. encode the canonical nouns in the Nx graph now
2. make project- and slice-owned Nx targets the primary verification surface
3. make tag-defined cohorts the primary migration unit from slice one
4. make manifest-shell structure graph-derived and sync-checked as soon as it becomes import-invisible
5. remove known policy escape hatches, including the `apps/server/src/rawr.ts` lint blind spot

Tests and custom structural analyzers still matter, but they are not the control plane. Nx is the control plane.

---

## What Is Settled vs Open

### Settled by canon and V3

These points are not open and should be written as directives:

- `hq` is the app identity. `server`, `async`, `web`, `cli`, and `agent` are roles, not peer apps.
- the manifest is upstream authority for app identity, role membership, boot contributions, and surfaces
- entrypoints explicitly select which roles boot in one process
- the bootgraph is downstream, process-local, and narrow
- services own capability truth
- plugins are runtime projections
- apps compose plugins into manifests and entrypoints
- the plugin tree is `plugins/<role>/<surface>/<capability>`
- `plugins/agent/tools/*` is the canonical agent plugin root
- Nx is downstream implementation policy, but it is the correct place to encode graph, policy, and mechanical enforcement
- V3's service promotions and plugin extractions are classification decisions, not open classification debates

### Still genuinely open

These remain downstream implementation choices:

- exact Nx tag names and `depConstraints`
- whether a given native Nx target uses inferred targets, `nx:run-commands`, or a custom local executor
- exact project-graph plugin mechanics and sync-generator implementation
- final plugin authoring API shape such as `definePlugin()`
- service-internal folder law and per-service contract details
- the exact threshold for when multi-service runtime composition should be promoted into a composed service
- the landing package for extracted Inngest auth support matter: `packages/inngest-auth` or `packages/coordination-inngest`

No other optionality should remain in the migration guardrails.

---

## Remediation Of The Prior Conservative Choices

This section explicitly replaces every overly conservative recommendation from the prior proposal.

| Prior conservative choice | Decisive revision |
| --- | --- |
| "Wrap the existing phase gates and standardize them." | Existing scripts are transitional only. Structural verification must move into first-class Nx targets owned by real projects and real slices. Root orchestration may aggregate them, but it must not remain the primary enforcement surface. |
| "Root-level first if needed, then project- or slice-level." | Project- and slice-owned targets are the default from the start. Root targets exist only as aggregators across already-owned targets. |
| "Prefer explicit project lists first. Move to tag-driven cohorts once stable." | Tag-defined cohorts are the canonical migration unit from slice one. Explicit project lists are allowed only as one-off bootstrap commands during tag bring-up, never as the enduring workflow model. |
| "If `apps/server/src/rawr.ts` remains ignored by ESLint, keep explicit structural tests around it." | The ignore must be removed as part of the migration. Structural tests remain, but the file must stop being a policy blind spot. Extract the reusable Inngest auth primitive and lint the file. |
| "Add sync generators only when a structural artifact is graph-derived." | The app/manifest/role/surface shell is already a real derived artifact. Introduce a graph-derived architecture inventory and `nx sync:check` early, before later bootgraph detail work. |
| "Use graph extensibility only where imports are insufficient." | The first time manifest-shell or bootgraph relationships become semantically real but import-invisible, Nx graph modeling is mandatory, not optional. |
| `runtime:*` or `surface:*` as the runtime axis | Replace this with explicit canonical nouns: `app:*`, `role:*`, and `surface:*`. Do not blur `role` and `surface` into one axis. |
| Implicitly normalizing `apps/server`, `apps/web`, `apps/cli` as enduring app identities | Treat those as transitional filesystem state only. The graph and guardrails must encode the target shell immediately: one `app:hq` with multiple roles. |

---

## Canonical Architecture Assumptions The Guardrails Must Encode

### 1. App identity and roles

The graph must reflect the target shell now, even before every file move is complete.

The authoritative app identity is:

```text
app:hq
```

The authoritative roles are:

```text
role:server
role:async
role:web
role:cli
role:agent
```

Do not encode `apps/server`, `apps/web`, and `apps/cli` as enduring app identities in Nx metadata. Those are transitional directories, not target-state nouns.

### 2. Manifest authority

The migration controls must treat the manifest seam as upstream:

- manifest defines app identity
- manifest defines role membership
- manifest defines process and role boot contributions
- manifest defines surfaces
- entrypoint selects which roles boot now
- bootgraph realizes that selection in one process

Nx must validate that seam. Nx must not become a second manifest.

### 3. Bootgraph scope

The migration controls must keep the bootgraph narrow:

- it owns boot module identity
- it owns dependency resolution and ordering
- it owns rollback and shutdown ordering
- it owns typed process context assembly
- it does not own app identity
- it does not own manifest definition
- it does not own plugin discovery
- it does not own repo policy logic

This matters because graph-derived migration controls should model manifest-shell truth first. They should model bootgraph internals only when real non-import boot dependencies appear.

### 4. Dependency direction

The graph must enforce the canonical semantic direction:

```text
packages -> services -> plugins -> apps
```

That direction is not provisional.

---

## Decisive Control Stack

### 1. Encode the canonical nouns in Nx metadata immediately

The required graph dimensions are:

- `type:*`
  - `type:package`
  - `type:service`
  - `type:plugin`
  - `type:app`
- `capability:*`
  - one capability tag per semantic boundary or migration slice root
  - examples: `capability:coordination`, `capability:state`, `capability:plugin-management`
- `app:*`
  - examples: `app:hq`
- `role:*`
  - `role:server`
  - `role:async`
  - `role:web`
  - `role:cli`
  - `role:agent`
- `surface:*`
  - `surface:api`
  - `surface:internal`
  - `surface:workflows`
  - `surface:consumers`
  - `surface:schedules`
  - `surface:app`
  - `surface:commands`
  - `surface:tools`
- `migration-slice:*`
  - transient rollout tags only

Use the canonical nouns where they actually apply:

- services must carry `type:service` and `capability:*`
- packages must carry `type:package`
- plugins must carry `type:plugin`, `capability:*`, `role:*`, and `surface:*`
- app-owned runtime projects and entrypoints must carry `type:app`, `app:hq`, and the relevant `role:*`

Do not collapse `role` and `surface` into one blurred runtime axis.

### 2. Make Nx boundaries enforce the semantic direction

Use `@nx/enforce-module-boundaries` as the first-line enforcement fence.

The policy must explicitly encode:

- services never depend on plugins or apps
- plugins do not become semantic upstreams over services
- apps compose services and plugins but do not redefine service truth
- packages support other kinds without becoming capability truth

Temporary migration rules should be added as tag constraints, not as hand-maintained allowlists in scripts.

### 3. Promote structural verification into real Nx targets

Structural verification must be owned by the actual projects and slices being migrated.

Required target surface:

- `lint`
- `test`
- `typecheck` or `build`
- `structural`

Rules:

- every project or tag-defined slice participating in the migration must expose `structural`
- root may expose aggregate targets such as `structural:all`, but root must not remain the primary owner of structural verification
- existing shell scripts may survive temporarily behind those targets, but only as implementation details while they are converted into native project-owned targets, local executors, or graph-derived checks

### 4. Add `targetDefaults` and `namedInputs` up front

`nx.json` must carry the verification semantics centrally.

Required named inputs:

- source files
- `nx.json`
- `eslint.config.mjs`
- root `package.json`
- lockfile
- manifest files such as `rawr.hq.ts`
- architecture inventory artifacts
- local structural executors or scripts
- relevant runtime version inputs

Required `targetDefaults`:

- `lint`
- `test`
- `typecheck`
- `build`
- `structural`
- `sync`

This is not optional hygiene. It is the minimum needed for cacheable architectural verification.

### 5. Add a graph-derived architecture inventory early

Do this before the migration gets deep.

Introduce a sync-generated architecture inventory or ledger that validates at least:

- app identity
- entrypoint-to-role mapping
- manifest presence and ownership
- plugin path shape: `plugins/<role>/<surface>/<capability>`
- service/plugin/app dependency direction
- projects whose tags do not match their intended architectural identity
- explicit transitional exceptions, if any

This artifact is already justified because the canonical app shell is already known even if the repo has not fully converged.

Use `nx sync:check` to make this a hard-fail gate.

### 6. Add project-graph modeling the first time imports stop telling the truth

The decisive rule is:

- if an architectural relationship is semantically real and import-visible, enforce it with tags and boundaries
- if an architectural relationship is semantically real and import-invisible, model it in the Nx graph immediately

The main candidate is the manifest / entrypoint / bootgraph seam.

Do not wait for "advanced later work" once that seam becomes relevant to the slice being migrated.

### 7. Keep custom analyzers and tests, but demote them from control plane to oracle

Tests and custom static analyzers still matter for:

- host composition
- route-family assertions
- telemetry contracts
- evidence integrity
- manifest purity checks
- domain-specific invariants that are not graph-expressible

They remain the oracle for those concerns.

But they should be invoked as owned Nx targets, selected by graph truth, not as the primary orchestration mechanism.

---

## Required Up-Front Work Before Slice One

Do all of this before the first structural move:

1. encode canonical tags for the first slice and every directly touched projection
2. encode `app:hq` and real `role:*` tags for the runtime shell
3. replace `runtime:*` thinking with `role:*` and `surface:*`
4. define project- or slice-owned `structural` targets
5. install `targetDefaults` and expanded `namedInputs`
6. create the first architecture inventory and wire `nx sync:check`
7. tighten boundary rules for the first slice
8. remove the `apps/server/src/rawr.ts` ESLint blind spot
9. make `lint:boundaries` and structural verification hard-fail, not warning-tolerant checkpoints

Do not postpone these until after the first move. If they come later, the early slices are unverifiable in the way this migration needs.

---

## Suggested Slice Workflow

Use this workflow for every structural slice.

### Step 0. Declare the slice in graph metadata

Assign:

- `capability:*`
- `migration-slice:*`
- any required `app:*`, `role:*`, and `surface:*` tags

The graph is the slice definition. Do not start from an ad hoc project list.

### Step 1. Attach ownership-local verification

Ensure every project in the slice exposes:

- `lint`
- `test`
- `typecheck` or `build`
- `structural`

If a current gate exists only as a root script, move or wrap it behind the owning project target now.

### Step 2. Encode the boundary and direction

Add the relevant boundary constraints for:

- semantic direction
- slice-local temporary restrictions
- app / role / surface shell rules where applicable

### Step 3. Regenerate the architecture inventory

Run the sync generator and make sure:

- tags match intended architecture
- plugin paths match canonical role/surface placement
- manifest-shell inventory remains coherent

### Step 4. Run the pre-move proof

Run the tag-defined cohort gate:

```bash
bunx nx run-many -t sync,structural,lint,test,typecheck --projects='tag:migration-slice:<slice>' --nxBail
```

### Step 5. Perform the structural move

Move code, imports, exports, and project boundaries.

Immediately retag if any project identity changes during the move.

### Step 6. Re-run proof uncached at slice milestones

At every meaningful milestone, prove the slice clean without cache:

```bash
bunx nx run-many -t sync,structural,lint,test,typecheck --projects='tag:migration-slice:<slice>' --skip-nx-cache --nxBail
```

### Step 7. Enforce blast radius in CI

Use `affected` with the same target surface:

```bash
export NX_BASE=<latest-successful-main-sha>
export NX_HEAD=$GIT_SHA
bunx nx affected -t sync,structural,lint,test,typecheck --nxBail
```

### Step 8. Remove temporary slice-local exceptions immediately

The ratchet rule is strict:

- add temporary boundary escape hatch only if required to land the slice
- make it explicit in tags or inventory
- remove it in the same slice or the next immediately dependent slice

Do not carry transitional ambiguity forward.

---

## Concrete Configuration Examples

These are examples of the direction, not frozen syntax.

### Example graph metadata

Service:

```json
{
  "name": "@rawr/coordination",
  "nx": {
    "tags": [
      "type:service",
      "capability:coordination"
    ]
  }
}
```

Plugin:

```json
{
  "name": "@rawr/support-server-api",
  "nx": {
    "tags": [
      "type:plugin",
      "app:hq",
      "role:server",
      "surface:api",
      "capability:support"
    ]
  }
}
```

App-owned entrypoint/runtime project:

```json
{
  "name": "@rawr/hq-server",
  "nx": {
    "tags": [
      "type:app",
      "app:hq",
      "role:server"
    ]
  }
}
```

### Example boundary policy

```js
"@nx/enforce-module-boundaries": [
  "error",
  {
    allow: [],
    depConstraints: [
      {
        sourceTag: "type:service",
        onlyDependOnLibsWithTags: ["type:service", "type:package"]
      },
      {
        sourceTag: "type:service",
        notDependOnLibsWithTags: ["type:plugin", "type:app"]
      },
      {
        sourceTag: "type:plugin",
        onlyDependOnLibsWithTags: ["type:service", "type:package"]
      },
      {
        sourceTag: "type:plugin",
        notDependOnLibsWithTags: ["type:plugin", "type:app"]
      },
      {
        sourceTag: "type:app",
        onlyDependOnLibsWithTags: ["type:plugin", "type:service", "type:package"]
      },
      {
        sourceTag: "type:app",
        notDependOnLibsWithTags: ["type:app"]
      }
    ]
  }
]
```

The role/surface shell should be validated by graph-derived inventory and by path/tag coherence checks, not by pretending `role` and `surface` are just another layer tag.

### Example `nx.json` additions

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["default", "!{projectRoot}/dist/**", "!{projectRoot}/coverage/**"],
    "architectureGlobals": [
      "{workspaceRoot}/nx.json",
      "{workspaceRoot}/package.json",
      "{workspaceRoot}/eslint.config.mjs",
      "{workspaceRoot}/rawr.hq.ts",
      "{workspaceRoot}/tools/architecture/**",
      "{workspaceRoot}/scripts/phase-a/**/*",
      "{workspaceRoot}/scripts/phase-2_5/**/*",
      { "runtime": "node --version" }
    ],
    "structuralInputs": [
      "default",
      "^production",
      "architectureGlobals"
    ]
  },
  "targetDefaults": {
    "lint": {
      "cache": true,
      "inputs": ["default", "^production", "architectureGlobals"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production", "architectureGlobals"]
    },
    "typecheck": {
      "cache": true,
      "inputs": ["default", "^production", "architectureGlobals"]
    },
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production", "architectureGlobals"]
    },
    "structural": {
      "cache": true,
      "inputs": ["structuralInputs"]
    },
    "sync": {
      "cache": false,
      "inputs": ["structuralInputs"]
    }
  }
}
```

### Example architecture inventory

The generated artifact should validate shell truth such as:

```json
{
  "apps": {
    "hq": {
      "roles": ["server", "async", "web", "cli", "agent"],
      "entrypoints": {
        "server": "apps/hq/server.ts",
        "async": "apps/hq/async.ts",
        "web": "apps/hq/web.ts",
        "cli": "apps/hq/cli.ts",
        "agent": "apps/hq/agent.ts"
      }
    }
  },
  "plugins": [
    {
      "project": "@rawr/support-server-api",
      "role": "server",
      "surface": "api",
      "capability": "support",
      "path": "plugins/server/api/support"
    }
  ]
}
```

This artifact should fail generation or sync-check when:

- a plugin path does not match its role/surface tags
- an app project is not tagged with the right `app:*`
- a runtime project claims the wrong role
- a project still encodes `apps/server` or `apps/web` as app identity instead of `app:hq`

### Example ownership-local targets

Preferred shape:

- `@rawr/coordination:structural`
- `@rawr/plugin-support-api:structural`
- `@rawr/hq-server:structural`

Temporary root aggregation is acceptable only as:

- `rawr-hq-template:structural:all`
- `rawr-hq-template:structural:phase-a`

Those must aggregate project-owned targets, not replace them.

---

## Repo-Specific Directives

These are the direct implications for this repo.

### 1. Stop preserving current app names as target-state truth

The runtime shell must be modeled as one HQ app with multiple roles.

Even before physical relocation is complete, encode:

- `app:hq`
- `role:server`
- `role:async`
- `role:web`
- `role:cli`
- `role:agent`

### 2. Firm the plugin tree immediately

Use:

```text
plugins/server/api/*
plugins/server/internal/*
plugins/async/workflows/*
plugins/async/consumers/*
plugins/async/schedules/*
plugins/web/app/*
plugins/cli/commands/*
plugins/agent/tools/*
```

Do not keep "tools or skills" ambiguity for agent plugins.

### 3. Remove `type:app -> *`

Apps are the composition layer. They are not unrestricted consumers of anything.

The boundary rule must be changed up front.

### 4. Remove the `apps/server/src/rawr.ts` ignore

Do not preserve this file as a policy blind spot.

Required action:

- extract the Inngest auth primitive into a support package
- lint `apps/server/src/rawr.ts`
- keep its structural tests as additional oracle coverage

### 5. Move structural ownership away from root scripts

The current package-script gates in `package.json` are not the right end state.

They may remain as temporary plumbing during the migration, but only behind project-owned or slice-owned Nx targets.

### 6. Make manifest-shell purity a first-class structural concern

V3 already says `rawr.hq.ts` is impure. The revised guardrails must enforce that cleanup as part of the structural migration:

- manifest declares composition
- service implementation and host adapters live outside the manifest
- entrypoints stay thin and explicit

### 7. Introduce graph-derived shell validation before full bootgraph detail work

Do not wait for the final bootgraph package to exist before making the shell machine-verifiable.

Start with:

- app identity
- manifest ownership
- role/entrypoint mapping
- plugin role/surface placement
- semantic dependency direction

Then extend graph modeling later for import-invisible boot dependencies.

---

## Final Recommendation

The prior proposal was correct to use Nx more deeply. It was too conservative only where it preserved today's wrapper-heavy orchestration or today's filesystem names as though they were target-state truth.

The decisive version is:

- encode the canonical `app`, `role`, and `surface` shell now
- encode semantic direction now
- make Nx the graph-derived control plane now
- move structural verification ownership to real projects and slices now
- generate and sync-check the architecture inventory early
- remove known policy blind spots now
- keep bootgraph downstream and narrow
- keep tests and custom analyzers as the oracle for runtime and domain invariants

That is the right up-front structural posture for this migration.

---

## Sources

### Canonical architecture docs

- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/README.md`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/01_App_Manifest_and_Entrypoints.md`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/02_Bootgraph.md`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/03_Services_Plugins_and_Role_Runtime.md`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/04_Realization_Operations_and_Evolution.md`

### Prior research and migration grounding

- `.context/research/repo-structural-migration-guardrails-2026-03-21/proposals/STRUCTURAL-MIGRATION-GUARDRAILS-PROPOSAL.md`
- `.context/research/repo-structural-audit-2026-03-20/proposals/PROPOSAL-V3.md`

### Repo-local evidence

- `nx.json`
- `eslint.config.mjs`
- `package.json`
- `apps/server/src/rawr.ts`
- `scripts/phase-a/verify-gate-scaffold.mjs`
