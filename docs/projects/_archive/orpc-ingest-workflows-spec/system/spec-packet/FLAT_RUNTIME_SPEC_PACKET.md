# Flat Runtime Surfaces Spec Packet
> **Authority note:** This packet has been superseded by `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`. Routine reference should go there; legacy context and extraction artifacts live under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/additive-extractions/`.

## Status
- Date: 2026-02-13
- Scope: Decision-complete architecture packet for flat runtime surfaces and manifest-first composition.
- Primary baseline doc: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`
- Decision register: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md`

## 1) Problem Statement
We currently have valid building blocks (TypeBox + oRPC + Inngest + host fixtures), but composition authority is still easy to spread across multiple places (`apps/server`, plugin loaders, and docs conventions). That creates three failures over time:
1. capability wiring becomes inconsistent,
2. plugin boundaries get porous,
3. AI agents face too many ambiguous paths when shipping a change.

### Design goals this packet optimizes for
1. **Single composition authority** for cross-surface wiring.
2. **Strong runtime boundaries** between surfaces.
3. **Shared package-first capability authoring** for contracts and logic.
4. **Operational clarity** for template vs personal ownership.
5. **Agent-friendly implementation path** with low branching ambiguity.

## 2) Context and Constraints
1. We already run a dual command-surface world (external plugin manager vs workspace runtime plugin commands).
2. Current host code mounts ORPC and Inngest in fixture apps.
3. Existing docs still carry legacy metadata semantics (`templateRole`, `channel`, publish posture fields) that can be misread as runtime controls.
4. We must preserve Graphite-first process and template/personal split governance.

## 3) Target Architecture Decisions

### Decision summary
| Decision | Why this decision | Implications |
| --- | --- | --- |
| Keep runtime roots surface-split (`api`, `workflows`, `web`, `cli`, `agents`, optional `mcp`) | Keeps runtime semantics explicit; avoids lifecycle coupling between unrelated surfaces. | More directories, but clearer ownership and operational controls. |
| Keep capability contracts/logic in `packages/*` | Enables reuse and cross-surface consistency via shared TypeBox/oRPC/event artifacts. | Package quality bar must rise (schemas/contracts become the center). |
| Compose only in `rawr.hq.ts` | Eliminates dual composition paths and makes system assembly reviewable. | Manifest becomes high-value file requiring tests and policy checks. |
| Prohibit plugin-to-plugin runtime imports | Prevents hidden coupling and transitive runtime dependencies. | Some helpers must move into shared packages to stay reusable. |
| Minimize metadata to `rawr.kind` + `rawr.capability` | Removes concept overload and runtime ambiguity from legacy fields. | Migration work required in docs/tooling that relied on legacy metadata. |

### Why not capability-root sparse plugin topology right now
Capability-root sparse plugins improve local colocation, but in this repo they increase migration blast radius in sync, lifecycle controls, and command semantics. Surface-split roots keep lifecycle semantics stable while still allowing capability grouping in manifest metadata.

## 4) Public Interface Contract (with rationale)

### `RawrHqManifest`
The manifest is not just a registry; it is the architecture boundary that ensures fixture hosts remain thin.

```ts
import type { Inngest } from "inngest";

export type ApiPluginRegistration = {
  namespace: string;
  contract: unknown;
  router: unknown;
};

export type WorkflowPluginRegistration = {
  functions: readonly unknown[];
};

export type WebPluginRegistration = {
  mounts: readonly {
    pluginId: string;
    mountId: string;
    load: () => Promise<unknown>;
  }[];
};

export type CliPluginRegistration = {
  commands: readonly {
    commandId: string;
    summary: string;
    run: (argv: string[]) => Promise<number>;
  }[];
};

export type AgentPluginRegistration = {
  capabilities: readonly {
    capabilityId: string;
    description: string;
  }[];
  knowledgeRefs: readonly {
    id: string;
    sourcePackage: string;
    sourceExport: string;
  }[];
};

export type McpPluginRegistration = {
  actions: readonly {
    actionId: string;
    description: string;
  }[];
};

export type RawrHqManifest = {
  orpc: {
    contract: unknown;
    router: unknown;
    context: Record<string, unknown>;
  };
  inngest: {
    client: Inngest;
    functions: readonly unknown[];
  };
  web: { mounts: WebPluginRegistration["mounts"] };
  cli: { commands: CliPluginRegistration["commands"] };
  agents: { capabilities: AgentPluginRegistration["capabilities"] };
  mcp?: { actions: McpPluginRegistration["actions"] };
};
```

### Why each manifest section exists
1. `orpc`: typed API assembly and transport mounting.
2. `inngest`: durable workflow function aggregation.
3. `web`: mount descriptors for runtime UI surfaces.
4. `cli`: command registry for command-surface assembly.
5. `agents`: declarative capability + knowledge exposure.
6. `mcp`: optional remote tool exposure contract.

## 5) Metadata and Boundary Contract

### Metadata
Required runtime metadata:
- `rawr.kind`
- `rawr.capability`

Rationale:
- enough information for lifecycle routing and grouping,
- avoids duplicating runtime meaning across multiple fields.

Legacy fields policy:
- removed from runtime semantics now: `templateRole`, `channel`
- deprecated for later removal: `publishTier` / `published`

### Import boundary
Allowed:
- `plugins/**` -> `packages/**`
- `plugins/**` -> approved host interfaces/types

Disallowed:
- `plugins/**` -> other `plugins/**` runtime code

Implication:
- shared helpers move upward into package layer; runtime adapters remain thin.

## 6) Workflow-to-API Exposure Policy
Default:
- API plugins expose procedures.
- Workflow plugins expose Inngest functions.
- API handlers trigger workflows via package-owned contracts/events.

Rationale:
- keeps request/response semantics separate from durable execution semantics,
- avoids collapsing all runtime concerns into one adapter class.

Deferred optimization:
- workflow-backed ORPC helper package only after repeated boilerplate is proven.

## 7) Migration Strategy (with risk model)

### Phase 1: Manifest introduction
- add `rawr.hq.ts` + manifest smoke checks,
- keep compatibility bridge for existing host wiring.

Risk:
- temporary dual path during migration.
Mitigation:
- new capabilities must use manifest path only.

### Phase 2: Host fixture cutover
- host fixtures mount manifest outputs only.

Risk:
- regression in routing/mounting during cutover.
Mitigation:
- integration checks for `/rpc`, `/api/orpc`, `/api/inngest`.

### Phase 3: cleanup and de-legacy
- remove duplicate app-level composition,
- remove runtime dependence on legacy metadata.

Risk:
- hidden consumers of deprecated fields.
Mitigation:
- CI metadata checks + staged deprecation window.

## 8) Required Validation and Acceptance
1. Canonical spec and supporting axis docs exist and stay linked.
2. Every policy rule includes concrete examples and implications.
3. Open decisions are closed or deferred with owner/date/impact in `DECISIONS.md`.
4. Migration is phased and test-gated.
5. Written architecture model no longer describes dual composition authority.

## 9) Supporting Axis Docs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`

## 10) No Hidden Decisions Rule
If implementation reveals a new architecture-impacting choice, add it to `DECISIONS.md` before continuing.
