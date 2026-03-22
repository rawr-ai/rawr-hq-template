# Structural Migration Guardrails Proposal

**Date**: 2026-03-21  
**Input**: Proposal V3 for the temporary structural refactor ahead of the Tap manifest bootgraph and broader runtime-architecture discussion  
**Question**: Are tests and lint rules enough, or should Nx be used more deeply to make each migration slice structurally verifiable before moving to the next?

---

## Executive Recommendation

Use Nx more deeply, but narrowly and deliberately.

Tests and lint rules alone are not enough for this migration. They are necessary, but they answer different questions:

- tests tell us whether behavior still works
- custom structural tests and scripts tell us whether composition, manifest, route, and runtime invariants still hold
- lint tells us whether local imports violate policy
- Nx tells us what the slice is, what depends on it, which checks should run, and how to make the policy repeatable

The recommended approach is:

1. Apply a thin Nx control layer up front before the first structural move.
2. Keep the repo's existing structural gates as the oracle for architecture invariants that imports cannot express.
3. Tighten Nx slice-by-slice as projects are retagged and moved.
4. Use Nx to select, standardize, and enforce the checks, not to replace the checks.

The OSS baseline is strong enough for the migration:

- multi-dimensional tags
- `@nx/enforce-module-boundaries`
- `@nx/dependency-checks` where build targets exist
- `targetDefaults`
- `namedInputs`
- `nx run-many`
- `nx affected`
- `nx graph`
- sync generators and `nx sync:check` when structural artifacts become graph-derived

Optional advanced layers:

- custom project-graph plugin if Tap manifest or bootgraph edges are not visible in imports
- `@nx/conformance` and `@nx/owners` if Nx Enterprise is available and you want graph-wide or ownership enforcement

---

## Current Repo Posture

### What already exists

- Nx is installed and the workspace is on `22.5.4`.
- The workspace already has a basic boundary rule in [eslint.config.mjs](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/eslint.config.mjs).
- The root project already exposes architectural gate targets through Nx-backed scripts:
  - `phase-a:gates:baseline`
  - `phase-2_5:gates:quick`
  - `phase-2_5:gates:exit`
- The repo already has strong structural tests and verification scripts around:
  - manifest smoke
  - host composition
  - route boundaries
  - telemetry
  - evidence integrity

### What is missing

- Tags are too coarse. Most projects only carry `type:*`.
- `nx.json` has almost no orchestration policy:
  - minimal `namedInputs`
  - no `targetDefaults`
- Boundary enforcement is only a layer fence, not a slice fence.
- `type:app` is effectively unrestricted today.
- Future architectural slices are not encoded in the graph yet, so Nx cannot verify the future architecture even if we already know what it should be.

### Important blind spots

- [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts) is excluded from ESLint. That is acceptable only if it remains covered by explicit structural tests. It must not become an unguarded exception.
- `lint:boundaries` currently allows warnings. For migration checkpoints, structural cleanliness should be a hard-fail target.

---

## Why Tests and Lint Are Not Enough By Themselves

Tests and lint alone are too local.

### Tests

Tests are the main behavioral oracle and should stay that way. But they do not answer:

- which projects are in the active slice
- which downstream projects are affected by the move
- whether the dependency graph now violates the intended architecture even if behavior still happens to pass

### ESLint boundaries

`@nx/enforce-module-boundaries` is excellent, but its documented scope is JS/TS imports and `package.json` dependencies. It does not, by itself, give you:

- graph-derived cohort selection
- task orchestration
- cache-aware repeatability
- manifest-derived dependency modeling
- non-import structural enforcement

### What Nx adds

Nx adds the missing control plane:

- encode the slice in tags
- encode the allowed edges as policy
- expose structural checks as first-class targets
- use the graph to run the right checks for the right slice
- fail early when graph-derived artifacts are stale

That is the difference between "we have checks" and "we have a migration workflow."

---

## Recommended Control Stack

### 1. Up-front Nx tag model

Add a minimal multi-axis tag taxonomy before the first move.

Recommended dimensions:

- `type:*`
  - `type:service`
  - `type:package`
  - `type:plugin`
  - `type:app`
- `scope:*`
  - one tag per architectural slice or capability boundary
  - examples: `scope:coordination`, `scope:state`, `scope:plugin-management`
- `runtime:*` or `surface:*`
  - encode host/projection role
  - examples: `runtime:neutral`, `runtime:server`, `runtime:cli`, `runtime:web`, `runtime:async`, `runtime:agent`
- optional rollout tag when helpful
  - `migration-slice:*`

This is the minimum needed to make "move one slice, verify one slice" real.

### 2. Strengthen `@nx/enforce-module-boundaries`

Use the Nx ESLint rule as the first enforcement fence.

Keep broad layer rules, but add slice-aware and role-aware rules. The important mechanisms are:

- `sourceTag`
- `allSourceTags`
- `onlyDependOnLibsWithTags`
- `notDependOnLibsWithTags`

Important Nx behavior to use deliberately:

- matching constraints are cumulative
- `notDependOnLibsWithTags` follows the dependency tree, not just the direct edge

That allows you to express:

- same-slice restrictions
- layer-direction restrictions
- runtime restrictions
- temporary "do not touch old slice X" rules

### 3. Add `@nx/dependency-checks` selectively

Use `@nx/dependency-checks` for publishable or buildable libs where dependency integrity matters.

This does not replace module boundaries. It complements them by checking that `package.json` dependency declarations match what the project graph and build inputs actually require.

This is especially useful during mechanical moves because dependency drift is common when files move but package manifests lag behind.

### 4. Standardize targets with `targetDefaults` and `namedInputs`

Move verification semantics into [nx.json](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/nx.json).

Use `targetDefaults` to make `lint`, `test`, `build`, `typecheck`, and `structural` behave consistently.

Use `namedInputs` so structural checks invalidate on the right files:

- `nx.json`
- `eslint.config.mjs`
- root `package.json`
- lockfile
- `rawr.hq.ts`
- structural gate scripts
- any generated manifest or index files
- runtime version inputs where relevant

This is what makes cached results trustworthy instead of accidentally green.

### 5. Promote structural checks into first-class Nx targets

Do not replace the repo's existing phase gates. Wrap and standardize them.

Recommended target surface:

- `lint`
- `test`
- `build` or `typecheck`
- `structural`

For this repo, `structural` should wrap the architecture-aware scripts and tests that already exist.

### 6. Use `run-many` for planned slices and `affected` for CI

Split the workflow cleanly:

- `nx run-many`
  - for explicit migration cohorts
  - deterministic checkpoints before moving to the next slice
- `nx affected`
  - for PR and CI enforcement
  - graph-aware blast-radius validation

This is a better fit than trying to force one command to do both jobs.

### 7. Add sync generators only when a structural artifact is graph-derived

Use sync generators and `nx sync:check` when the migration introduces graph-derived artifacts such as:

- manifest indexes
- bootgraph ledgers
- ownership registries
- structural inventories generated from project tags or graph edges

Do not add sync generators just because Nx supports them. Add them when there is a real derived artifact that can go stale.

### 8. Use graph extensibility only where imports are insufficient

If Tap manifest bootgraph edges are not visible in TypeScript imports, then the official Nx OSS extension path is:

- project-graph plugin
- sync generator
- optional CI check over the exported graph or generated artifact

This is the right place to handle bootgraph-specific structure. It is not a reason to overcomplicate the baseline migration controls.

---

## Up Front vs After

### Recommendation

Apply controls up front, but only the thin version.

### Why up front is better

If controls are added only after moves:

- early slices can drift before the graph knows the new truth
- policy failures arrive late, when blast radius is larger
- the migration becomes review-heavy instead of mechanically verifiable

If the full final-state policy is applied up front:

- the repo will likely fail everywhere at once
- noise will hide useful signal

### The correct middle position

Do this before the first move:

1. define the tag taxonomy
2. retag the first slice and its immediate projections
3. encode the first slice's boundary rules
4. expose the slice gate as Nx targets
5. run the slice gate before and after the move

Then ratchet per slice:

- move a slice
- retag its projects immediately
- tighten its policy immediately
- run its cohort gate
- enforce its blast radius in CI

That gives you forward pressure without a repo-wide flag day.

---

## Suggested Slice Workflow

Use this loop for each structural slice.

### Step 0. Define the slice cohort

Pick the projects that make up the slice:

- service candidate
- related support packages
- direct projections or hosts touched by the move

Prefer explicit project lists first. Move to tag-driven cohorts once the tag model is stable.

### Step 1. Encode the slice in tags

Before moving files, retag the projects so Nx knows the intended architectural identity.

### Step 2. Encode the boundary

Add or tighten the relevant `depConstraints` for that slice.

### Step 3. Expose the slice gate

Run a common gate surface for the slice:

- `structural`
- `lint`
- `test`
- `build` or `typecheck`

### Step 4. Run the pre-move proof

Run the cohort gate before moving files to establish the baseline.

### Step 5. Perform the mechanical move

Move the code and update imports/exports as needed.

### Step 6. Retighten and verify

Immediately rerun the cohort gate.

If the move produces graph-derived artifacts, run `nx sync:check` as part of the gate.

### Step 7. CI enforcement

Use `nx affected` against the latest successful `main` commit to verify the slice and its blast radius in PRs.

### Step 8. Fresh proof runs at milestones

For risky slices, periodically run the same cohort gate with `--skip-nx-cache` to prove the slice is truly clean uncached.

---

## Concrete Configuration Examples

These examples are illustrative. They should be adapted to the repo's final naming decisions.

### Example tag model

```json
{
  "name": "@rawr/coordination",
  "nx": {
    "tags": [
      "type:service",
      "scope:coordination",
      "runtime:neutral"
    ]
  }
}
```

```json
{
  "name": "@rawr/plugin-session-tools",
  "nx": {
    "tags": [
      "type:plugin",
      "scope:session-intelligence",
      "runtime:cli"
    ]
  }
}
```

```json
{
  "name": "@rawr/server",
  "nx": {
    "tags": [
      "type:app",
      "scope:hq",
      "runtime:server"
    ]
  }
}
```

### Example ESLint boundary policy

```js
import nxPlugin from "@nx/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@nx": nxPlugin,
    },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: "type:service",
              onlyDependOnLibsWithTags: ["type:service", "type:package"],
            },
            {
              sourceTag: "type:service",
              notDependOnLibsWithTags: ["type:plugin", "type:app"],
            },
            {
              sourceTag: "type:plugin",
              onlyDependOnLibsWithTags: ["type:service", "type:package"],
            },
            {
              sourceTag: "type:plugin",
              notDependOnLibsWithTags: ["type:plugin", "type:app"],
            },
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: ["type:app", "type:plugin", "type:service", "type:package"],
            },
            {
              sourceTag: "scope:coordination",
              onlyDependOnLibsWithTags: ["scope:coordination", "scope:shared", "scope:platform"],
            },
            {
              allSourceTags: ["type:plugin", "runtime:cli"],
              notDependOnLibsWithTags: ["runtime:web"],
            },
          ],
        },
      ],
    },
  },
];
```

Why this helps:

- `type:*` rules enforce layer direction
- `scope:*` rules enforce slice boundaries
- `allSourceTags` allows runtime-specific exceptions without inventing composite tags
- `notDependOnLibsWithTags` prevents indirect leaks across forbidden boundaries

### Example `nx.json` additions

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["default", "!{projectRoot}/dist/**", "!{projectRoot}/coverage/**"],
    "sharedGlobals": [
      "{workspaceRoot}/nx.json",
      "{workspaceRoot}/package.json",
      "{workspaceRoot}/eslint.config.mjs",
      "{workspaceRoot}/rawr.hq.ts",
      "{workspaceRoot}/scripts/phase-a/**/*",
      "{workspaceRoot}/scripts/phase-2_5/**/*",
      { "runtime": "node --version" }
    ],
    "structuralInputs": [
      "default",
      "^production",
      "sharedGlobals"
    ]
  },
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production", "sharedGlobals"]
    },
    "typecheck": {
      "cache": true,
      "inputs": ["default", "^production", "sharedGlobals"]
    },
    "lint": {
      "cache": true,
      "inputs": ["default", "^production", "sharedGlobals"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production", "sharedGlobals"]
    },
    "structural": {
      "cache": true,
      "inputs": ["structuralInputs"]
    }
  }
}
```

Why this helps:

- common verification semantics live in one place
- structural gates rerun when architecture-relevant config changes
- build ordering is consistent
- cache usage becomes deliberate instead of accidental

### Example cohort and CI commands

Planned slice checkpoint:

```bash
bunx nx run-many -t structural,lint,test,build --projects=@rawr/coordination,@rawr/server,@rawr/web --nxBail
```

Tag-driven checkpoint:

```bash
bunx nx run-many -t structural,lint,test,build --projects='tag:migration-slice:coordination-v1' --nxBail
```

PR gate:

```bash
export NX_BASE=<latest-successful-main-sha>
export NX_HEAD=$GIT_SHA
bunx nx affected -t structural,lint,test,build --nxBail
```

Fresh proof run:

```bash
bunx nx run-many -t structural,lint,test,build --projects=@rawr/coordination,@rawr/server --skip-nx-cache --nxBail
```

Graph-derived sync gate:

```bash
bunx nx sync:check
bunx nx affected -t structural,lint,test,build --nxBail
```

### Example graph-extension use for bootgraph work

If bootgraph or manifest edges are not import-shaped:

1. add a local project-graph plugin that reads the manifest or boot configuration
2. emit custom dependencies with `createDependencies`
3. optionally emit tags or metadata with `createNodesV2`
4. materialize a bootgraph artifact or consistency ledger with a sync generator
5. fail CI with `nx sync:check` if that artifact is stale

This is the official Nx path to "bootgraph verification" without pretending Nx has a built-in feature by that exact name.

---

## Repo-Specific First Moves

These are the concrete first moves for this repo.

### 1. Introduce slice tags before the structural move

Do not wait until after the move. The graph needs to know the future architecture while the move is happening.

Start with the slices already identified in Proposal V3:

- coordination
- state
- journal
- security
- session-intelligence
- plugin-management
- agent-config-sync
- hq-operations

### 2. Tighten the current boundary rule

Change the current posture from:

- `type:app -> *`

to explicit allowances.

Apps are the composition layer, but that does not mean "anything goes."

### 3. Expose structural checks as first-class targets

Wrap the existing architectural scripts and tests as a stable target surface:

- root-level first if needed
- then project- or slice-level as the migration becomes more granular

This repo already has the raw ingredients. They need consistent Nx orchestration, not replacement.

### 4. Keep `apps/server/src/rawr.ts` under explicit guard

If it remains ignored by ESLint, preserve or strengthen its structural-test coverage. Do not let it become a hidden policy escape hatch.

### 5. Add `@nx/dependency-checks` where it pays off

Use it on buildable or publishable libraries and services once the build targets are stable enough for it to be signal, not noise.

### 6. Add sync only when there is a true derived artifact

Good candidates later:

- generated manifest registries
- bootgraph ledgers
- ownership indexes
- structural inventories derived from tags or graph edges

Not every policy needs a sync generator.

---

## OSS Baseline vs Enterprise Additions

### Recommended baseline now

Use this now:

- multi-axis tags
- `@nx/enforce-module-boundaries`
- `@nx/dependency-checks` where relevant
- `targetDefaults`
- `namedInputs`
- `run-many`
- `affected`
- `nx graph`
- sync generators only when a real derived artifact exists

### Optional if Enterprise is available

Add this only if you want the extra leverage:

- `@nx/conformance`
  - graph-wide enforcement beyond JS/TS imports
  - `evaluated` mode is useful for staged rollout
- `@nx/owners`
  - enforce ownership metadata
  - compile project-based CODEOWNERS through sync

### Recommendation on Enterprise features

Do not make the baseline proposal depend on Enterprise.

The migration can be secured effectively with OSS Nx plus the repo's current structural gates. Enterprise features are an accelerator and a hardening layer, not a prerequisite.

---

## Final Recommendation

The best approach is not "tests and lint only," and it is not "Nx everywhere."

It is:

- keep tests and custom architectural gates as the behavioral and structural oracle
- add a thin Nx policy layer up front
- encode slices in tags before moving them
- tighten module-boundary rules slice-by-slice
- standardize verification through `targetDefaults`, `namedInputs`, and first-class `structural` targets
- use `run-many` for planned cohort checkpoints and `affected` for PR/CI enforcement
- use sync generators and graph plugins only when manifest- or bootgraph-derived structure needs to become machine-verifiable

That gives the migration the property it actually needs: every slice can be proven structurally clean before the next slice begins.

---

## Sources

### Nx docs

- Enforce Module Boundaries: https://nx.dev/docs/features/enforce-module-boundaries
- Enforce Module Boundaries ESLint Rule: https://nx.dev/docs/technologies/eslint/eslint-plugin/guides/enforce-module-boundaries
- Tag in Multiple Dimensions: https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions
- Ban Dependencies with Certain Tags: https://nx.dev/docs/guides/enforce-module-boundaries/ban-dependencies-with-tags
- Dependency Checks ESLint Rule: https://nx.dev/docs/technologies/eslint/eslint-plugin/guides/dependency-checks
- Run Tasks: https://nx.dev/docs/features/run-tasks
- Run Only Tasks Affected by a PR: https://nx.dev/docs/features/ci-features/affected
- Inputs and Named Inputs: https://nx.dev/docs/reference/inputs
- Project Configuration: https://nx.dev/docs/reference/project-configuration
- nx.json Reference: https://nx.dev/docs/reference/nx-json
- Sync Generators: https://nx.dev/docs/concepts/sync-generators
- Create a Sync Generator: https://nx.dev/docs/extending-nx/create-sync-generator
- Extending the Project Graph: https://nx.dev/docs/extending-nx/project-graph-plugins
- Conformance Overview: https://nx.dev/docs/reference/conformance/overview
- Owners Overview: https://nx.dev/docs/reference/owners/overview

### Repo-local evidence

- [nx.json](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/nx.json)
- [eslint.config.mjs](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/eslint.config.mjs)
- [package.json](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/package.json)
- [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts)
- [scripts/phase-a/verify-gate-scaffold.mjs](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/scripts/phase-a/verify-gate-scaffold.mjs)
- [apps/server/test/route-boundary-matrix.test.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/test/route-boundary-matrix.test.ts)
- [PROPOSAL-V3.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/.context/research/structural-migration-proposal-2026-03-20/proposals/PROPOSAL-V3.md)
