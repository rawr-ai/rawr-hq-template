
# 2026-02-18 — Flat Runtime Autonomy Review (Scratch + Continuation Packet)

## Verbatim scratchpad (raw notes)

### User correction / scope pivot
- User said prior response was too spec-text focused; asked to redo using specs as intended preview but also inspect current implementation, reconcile gaps, synthesize future end-to-end vision, then evaluate for agent autonomy.

### Canonical spec entrypoint (new packet)
- Spec entrypoint: `docs/projects/flat-runtime/README.md`
- Canonical authority: `docs/projects/flat-runtime/ARCHITECTURE.md`, decision register: `docs/projects/flat-runtime/DECISIONS.md`
- Leaf axes + examples under `docs/projects/flat-runtime/axes/*.md`, `docs/projects/flat-runtime/examples/*.md`

### Plan state created for redo
- Plan created (in-session tool):
  - in_progress: Map current runtime surfaces in code
  - pending: Extract intended target model from packet
  - pending: Diff reality vs target; fill gaps
  - pending: Synthesize end-to-end future vision
  - pending: Evaluate against agent autonomy goals
  - pending: Deliver prioritized recommendations and risks

### Current codebase reality (what I inspected)

#### Key discovery: target composition file is missing in current repo
- `rawr.hq.ts` does not exist at repo root (spec expects it as composition authority).
  - Command result: `ls -la rawr.hq.ts` -> "No such file or directory".

#### Current host wiring (real implementation)
- `apps/server/src/rawr.ts`
  - Implements `/rawr/plugins/web/:dirName` runtime module serving.
  - Creates a coordination runtime adapter via `createCoordinationRuntimeAdapter({ repoRoot, inngestBaseUrl })`.
  - Composes a single Inngest bundle via `createCoordinationInngestFunction({ runtime })`.
  - Mounts Inngest ingress: `app.all("/api/inngest", async ({ request }) => inngestHandler(request));`.
  - Registers ORPC routes: `registerOrpcRoutes(app, { repoRoot, baseUrl, runtime, inngestClient })`.

- Immediate observations vs spec posture:
  - `/api/inngest` exists and is mounted.
  - `/rpc` + `/api/orpc` exist (via `registerOrpcRoutes`).
  - `/api/workflows/*` does not appear in this file; spec expects explicit `/api/workflows/*` mount with OpenAPI handler + workflow boundary context.
  - I did not see signature verification enforcement for `/api/inngest` in this file.

#### Current oRPC routing (real implementation)
- `apps/server/src/orpc.ts`
  - Imports `hqContract` from `@rawr/core/orpc` (root contract composition currently is *packages*, not plugins).
  - `RawrOrpcContext` includes `repoRoot`, `baseUrl`, `runtime`, `inngestClient`.
  - Implements procedures (at least under `coordination.*`) that:
    - Read/write workflows and runs via `@rawr/coordination/node` storage.
    - Queue a run via `queueCoordinationRunWithInngest({ client: context.inngestClient, runtime: context.runtime, workflow, runId, input, baseUrl })`.
    - On failure, persists failed run status/timeline and throws `ORPCError("RUN_QUEUE_FAILED", { status: 500, ... })`.
  - Mounts:
    - `/rpc/*` via `RPCHandler`.
    - `/api/orpc` and `/api/orpc/*` via `OpenAPIHandler`.
    - OpenAPI spec at `/api/orpc/openapi.json`.
  - There are tests hitting these routes: `apps/server/test/orpc-openapi.test.ts`, `apps/server/test/orpc-handlers.test.ts`, `apps/server/test/rawr.test.ts`.

#### Current contract root
- `packages/core/src/orpc/hq-router.ts`
  - `hqContract = oc.router({ coordination: coordinationContract, state: stateContract })`.
  - So current “capability composition” is inside the `packages` layer, not `rawr.hq.ts` manifest-first composition.

#### Current runtime adapter
- `apps/server/src/coordination.ts`
  - Implements `createCoordinationRuntimeAdapter` backed by `@rawr/coordination/node` storage: memory, run status, timeline.

#### Current Inngest durable execution bundle
- `packages/coordination-inngest/src/adapter.ts`
  - Uses `Inngest` + `inngest/bun` `serve()`.
  - `queueCoordinationRunWithInngest()` validates workflow, persists queued status + timeline, then `client.send({ name: COORDINATION_RUN_EVENT, data: { runId, workflow, input, baseUrl } })`.
  - Run-level dedupe is implemented via an in-memory `runQueueLocks` map keyed by runId.
  - `createCoordinationInngestFunction()` defines one function `coordination-workflow-runner` with `retries: 2` and uses `step.run("coordination/run-start", ...)` etc.

### Plugin topology (current)
- Plugins present:
  - `plugins/agents/hq/...`
  - `plugins/cli/...`
  - `plugins/web/...`
- Plugins missing relative to flat-runtime packet’s target topology:
  - No `plugins/api/*`.
  - No `plugins/workflows/*`.
- So current system is not yet in “plugin-owned API/workflow boundary contracts” world.

### Immediate system-level gap hypotheses (not fully analyzed yet; to verify next)
- The current “coordination” surface is mounted under `/api/orpc/coordination/*` and `/rpc/*` and includes queueing durable runs; spec target wants workflow triggers on `/api/workflows/<capability>/*` (published) + `/rpc` for first-party, and `plugins/workflows/<capability>` owning those contracts.
- Current `/api/inngest` mount likely lacks signature verification and gateway deny rules described in spec.
- Current composition authority is not `rawr.hq.ts` (missing), and “manifest-driven capability-first workflow routing” does not exist in current runtime.

### Files read (important)
- `docs/projects/flat-runtime/README.md`
- `docs/projects/flat-runtime/ARCHITECTURE.md`
- `docs/projects/flat-runtime/DECISIONS.md`
- `docs/projects/flat-runtime/axes/*.md`
- `docs/projects/flat-runtime/examples/*.md`
- `apps/server/src/rawr.ts`
- `apps/server/src/orpc.ts`
- `apps/server/src/coordination.ts`
- `packages/core/src/orpc/hq-router.ts`
- `packages/coordination-inngest/src/adapter.ts`
- plus repo docs tying spec to target: `docs/SYSTEM.md`

### Repo state / workflow note
- Worktree is already dirty (many doc modifications/untracked) before I started this redo. I have not edited code; only read files and ran searches.
- `.scratch/` exists already; `.gitignore` does NOT include `.scratch/`.

---

## Continuation context packet (write in Matei's voice)

### 1) Overarching goal
I want a principal-level, system-level review of the flat-runtime future architecture that synthesizes (a) the intended target described by `docs/projects/flat-runtime/*` and (b) the current real implementation in the repo. Then I want that synthesized end-to-end future system evaluated through the lens of “autonomous development environment for AI agents”: feedback loops, robustness, drift control, and agent operability.

### 2) Current state / progress snapshot
The last thing that happened is: the agent started the redo and began Step 1 (map current runtime surfaces in code). It confirmed the canonical spec packet entrypoint (`docs/projects/flat-runtime/README.md`), then inspected the current server implementation and durable runtime wiring.

Where this leaves us: we have hard evidence of current reality (actual route mounts + contract composition + Inngest bundle), and a clear mismatch with the target spec (no `rawr.hq.ts`, no `plugins/api/*` / `plugins/workflows/*`, no `/api/workflows/*` surface). We have not yet completed the current-vs-target diff, nor produced the synthesized future vision or autonomy evaluation.

### 3) Invariants and decisions (for this continuation)
- Use `docs/projects/flat-runtime/README.md` as the canonical spec entrypoint and treat `docs/projects/flat-runtime/ARCHITECTURE.md` + `docs/projects/flat-runtime/DECISIONS.md` as authority.
- Treat specs as target-state intent, not current truth.
- Treat code as ground truth for current state: focus on `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`, `packages/core/src/orpc/hq-router.ts`, `packages/coordination-inngest/src/adapter.ts`.
- Do not “just validate spec text”; synthesize a coherent future system model that bridges current to target.
- Keep the analysis oriented around agent autonomy (operability, feedback loops, drift control, idempotency semantics, capability discoverability).
- No code edits are required for the review; keep this read-only unless explicitly asked.

### 4) Next step / immediate continuation
Read the remaining relevant runtime/composition code to finish the “current system” map, specifically:
1) finish reading `apps/server/src/orpc.ts` for mounts/auth/context creation details,
2) inspect `packages/core/src/orpc/index.ts` and `packages/coordination/src/orpc/contract.ts` to understand the current contract surface shape,
3) inspect `apps/server/src/app.ts` and `apps/server/src/index.ts` for overall server bootstrap and middleware,
4) confirm whether `/api/inngest` signature verification exists anywhere.

Then move immediately to a structured diff: “current system graph” vs “target system graph”, identify missing primitives (manifest generation, workflow trigger surfaces, plugin ownership), and propose the single coherent future end-to-end system that results.

### 5) Verbatim continuation snippet (programmatically inserted)
{{RAWR_VERBATIM_CONTINUATION_SNIPPET}}

Directive: After compaction, immediately execute “Next step / immediate continuation” (do not restart or re-plan).
