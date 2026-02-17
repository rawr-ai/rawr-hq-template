# Flat Runtime Surfaces Proposal (RAWR HQ v2)

## Status
- This document now serves as proposal history/context.
- The historical locked baseline is archived at: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`.
- The current authoritative packet is:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- Use the authoritative packet for all forward planning and implementation work.

## Overarching intent
- Keep day-to-day authoring simple for AI agents.
- Keep template infrastructure mostly hidden/untouched.
- Keep `packages` as reusable contract + logic artifacts.
- Keep runtime deployment/lifecycle units in `plugins`.
- Keep composition thin, explicit, and centralized.

## Convergence direction (single standard)
- **Single composition authoring surface:** `rawr.hq.ts` at repo root.
- **No optional/parallel composition path:** do not split authoring between `rawr.hq.ts` and `packages/hq/src/composition/*`.
- **`packages/*` remain library code:** domain logic, contracts, schemas, reusable adapters/helpers; no host app mounting orchestration authored there.
- **`packages/hq` scope:** headquarters domain logic (plugin lifecycle, sync/install/scaffold/security policy helpers), not runtime composition authoring.
- **`packages/core` scope:** cross-cutting primitives and base contracts only; avoid HQ-specific router composition here.

## Non-goals
- Do not force a single global domain model.
- Do not require every capability to have API + CLI + web + workflows.
- Do not push operational/runtime handling into pure domain packages.

## Terminology disambiguation
- `Agent workflows` means markdown/prompt command flows in agent plugins (`plugins/agents/*/workflows/*`).
- `Inngest workflows` means durable, long-running workflow execution units served at `/api/inngest`.
- `Inngest functions` are the executable registration units Inngest serves; a "workflow" may map to one or more functions/steps.
- `ORPC procedures` are API boundary procedures exposed on `/rpc` (and `/api/orpc` compatibility).

## Three-layer model

### 1) Reusable logic + contracts (`packages`)
- Pure domain logic.
- ORPC contract definitions.
- Shared schemas/types.
- Deterministic workflow step helpers.
- Reusable runtime-safe adapters (library-level), when not tied to a specific host bootstrap.

Boundary rule:
- No host/server bootstrap lifecycle logic here.
- No plugin enable/disable lifecycle here.

### 2) Runtime surfaces (`plugins`)
- Deployable/enableable/distributable runtime units.
- Flat plugin-type roots, no capability nesting required.

Proposed flat roots:
- `plugins/web/*`
- `plugins/cli/*`
- `plugins/agents/*`
- `plugins/api/*` (new)
- `plugins/workflows/*` (new)
- `plugins/mcp/*` (optional/new)

Each runtime surface may depend on one or multiple packages.

### 3) Composition + mounting (HQ composition layer)
- One thin place where headquarters is assembled.
- Infrastructure fixtures (`apps/server`, `apps/web`, `apps/cli`) import from this layer and stay mostly stable.
- **Resolved placement:** root manifest `rawr.hq.ts` (config-as-code), with typed helper imports from packages/plugins as needed.

## Where things go (contracts, implementations, routers)

### ORPC contracts
- Live in packages near domain logic, for example:
  - `packages/<domain>/src/orpc/contract.ts`
- Global HQ contract composition should be HQ-domain-owned, for example:
  - `packages/hq/src/orpc/hq-contract.ts`

### ORPC implementations
- Live in runtime API plugins (`plugins/api/*`) as handlers/mini routers.
- They call package domain services.
- They do not own global mounting.

### ORPC global router composition
- Happens in `rawr.hq.ts`.
- Server fixture mounts the composed router once.

### Inngest workflow composition
- Workflow runtime plugins (`plugins/workflows/*`) register Inngest functions/workflows.
- `rawr.hq.ts` aggregates them and returns final function list.
- Server fixture mounts one `serve` endpoint (`/api/inngest`) from the aggregated set.

### Web MFE composition
- Web plugins (`plugins/web/*`) keep UI mount implementation (`mount(el, ctx)`).
- `rawr.hq.ts` owns enabled-plugin resolution and host wiring contracts.
- Web fixture remains a host shell consuming composition outputs.

### CLI composition
- CLI plugins (`plugins/cli/*`) stay runtime command extensions.
- CLI core remains a fixture and reads composition/registry policy from `rawr.hq.ts`.

## Package meaning and role taxonomy (flat, not pre-baked domains)
- Keep `packages/*` physically flat.
- Use lightweight role semantics (doc + metadata), not deep directory nesting:
  - **Domain packages:** business/headquarters/domain behavior and invariants.
  - **Contract packages:** ORPC contracts, schemas, shared type surfaces.
  - **Adapter packages:** reusable library adapters (for example coordination helpers for Inngest), but not app bootstrap/mount code.
  - **UI/shared packages:** reusable UI contracts/components.
  - **Core primitives:** small cross-cutting building blocks; no HQ runtime composition ownership.

This preserves the original "domains emerge over time" intent while keeping boundaries explicit.

## Concrete v2 layout

### Full illustrative tree
```text
.
├── apps/
│   ├── cli/                    # fixture runtime (minimal, stable)
│   ├── server/                 # fixture runtime (minimal, stable)
│   └── web/                    # fixture runtime host shell (minimal, stable)
├── packages/
│   ├── hq/                     # headquarters domain logic (sync/lifecycle/scaffold/security)
│   ├── core/
│   │   └── ...                 # cross-cutting primitives (non-HQ-specific)
│   ├── <domain-a>/             # pure reusable logic + contracts
│   ├── <domain-b>/
│   └── coordination-inngest/   # shared adapter/runtime-safe helpers (no host bootstrap)
├── plugins/
│   ├── web/
│   │   └── capability-x-web/
│   ├── cli/
│   │   └── capability-x-cli/
│   ├── agents/
│   │   └── capability-x-agent/
│   ├── api/
│   │   └── capability-x-api/
│   ├── workflows/
│   │   └── capability-x-workflows/
│   └── mcp/
│       └── capability-x-mcp/
├── rawr.config.ts
└── rawr.hq.ts                  # required single composition manifest
```

### Single plugin example (API + workflows + web split, flat)
```text
plugins/
├── api/
│   └── capability-x-api/
│       ├── src/contract.ts        # re-export/import contract from packages if needed
│       ├── src/router.ts          # ORPC implementation handlers
│       ├── src/index.ts           # exports registerApiPlugin(...)
│       └── package.json
├── workflows/
│   └── capability-x-workflows/
│       ├── src/functions.ts       # Inngest function registrations
│       ├── src/index.ts           # exports registerWorkflowPlugin(...)
│       └── package.json
└── web/
    └── capability-x-web/
        ├── src/web.ts             # mount(el, ctx)
        ├── src/server.ts          # optional server route registration for this web plugin
        └── package.json
```

This keeps runtime concerns at the surface while sharing domain logic/contracts from `packages/*`.

## Composition manifest contract (`rawr.hq.ts`)
- `rawr.hq.ts` is the only authored assembly map for:
  - API plugin router registration/composition
  - Workflow function registration/composition
  - Web plugin host mount wiring
  - CLI extension policy/registry wiring
- Prefer convention-driven discovery in the manifest (scan plugin roots + enabled state + export contracts) over hand-maintained per-plugin lists.
- Fixture apps should consume this manifest and avoid bespoke composition logic.
- This keeps template/personal ownership clean: most operational plugin changes stay in plugin packages, without editing template-owned composition files.
- This keeps end-to-end capability hookup to ~3 authored touchpoints:
  1. domain/contracts in `packages/*`,
  2. runtime implementation in one or more `plugins/*`,
  3. assembly in `rawr.hq.ts`.

## Why this is better for agent DX
- Agents can ship a capability by editing one plugin type at a time.
- Agents do not need to modify core fixtures (`apps/*`) to wire new capability surfaces.
- Shared logic remains reusable and testable once in packages.
- Composition is explicit and discoverable in one place (`rawr.hq.ts`).
- Flat plugin types avoid premature capability containers and avoid forced multi-surface scaffolding.

## How this maps to current code (already working today)
- ORPC contract composition exists today in `packages/core/src/orpc/hq-router.ts` (candidate move to `packages/hq/src/orpc/hq-contract.ts`).
- ORPC implementation/mount exists today in `apps/server/src/orpc.ts`.
- Inngest mount exists today in `apps/server/src/rawr.ts` at `/api/inngest`.
- Server plugin loading/mounting exists today in `apps/server/src/plugins.ts` and `apps/server/src/index.ts`.
- Web host mount flow exists today in `apps/web/src/ui/pages/MountsPage.tsx` via `state.getRuntimeState` + `/rawr/plugins/web/:dirName`.

So the proposal is primarily about clarifying responsibilities and relocating composition touchpoints out of fixture apps into a single root composition manifest.

## Dynamic ORPC procedure composition (clarification)
- This is a **supported design direction**, not currently a full hot-plug runtime feature.
- Recommended behavior:
  - compose enabled API plugin routers at server startup,
  - build final HQ router once,
  - mount handlers once.
- Runtime enable/disable can remain state-driven with restart/reload semantics unless hot reload is explicitly implemented.

## ORPC in-process calls vs direct service calls
- ORPC in-process is not an anti-pattern.
- Use ORPC at explicit boundaries where contract enforcement and uniform procedure behavior are valuable.
- Inside the same runtime, direct package service calls are preferred for simple internal orchestration.
- Rule of thumb:
  - Boundary crossing (surface/API/client): ORPC.
  - Internal domain orchestration in same process: direct service APIs.

## Alternatives considered

### A) Keep today as-is, docs only
- Pros: zero structural change.
- Cons: composition touchpoints remain split across `apps/*`, more fixture touching in daily work.

### B) Nested capability container under plugins
- Pros: all surfaces for a capability together.
- Cons: forces structure before capability needs are known; hurts flat composability.

### C) Everything runtime in packages
- Pros: fewer roots.
- Cons: blurs pure logic vs runtime lifecycle boundaries; increases accidental coupling.

### D) Recommended: flat plugin types + dedicated HQ composition layer
- Pros: clean split, easy composition, minimal fixture touching, strong agent ergonomics.
- Cons: introduces one more explicit concept (composition manifest), requires naming discipline.

### E) Opposite model: capability-flat sparse plugins
- Shape:
  - `plugins/<capability>/...`
  - optional sub-areas such as `cli/`, `web/`, `api/`, `workflows/`, `agents/`
- Pros:
  - strong colocation for a capability that grows over time,
  - easier "one capability, one directory" mental model,
  - can reduce cross-root hopping when authoring multi-surface capability work.
- Cons:
  - blurs current channel boundaries and plugin-kind semantics (`toolkit|web|agent`),
  - raises risk of version/lifecycle coupling across unrelated surfaces,
  - requires broad rewiring of discovery, sync scoping, enablement policy, and workspace conventions.

Feasibility:
- **Viable in principle**, but this is not a no-cost rename; it is a different plugin model with cross-cutting migration impact.
- If chosen, it should be treated as a separate architecture cutover (not folded into this proposal's current migration slice).

## Composition placement decision (resolved)
- **Chosen standard:** root manifest `rawr.hq.ts`.
- **Not chosen:** authoring composition under `packages/hq/src/composition/*`.
- **Not chosen:** keeping composition split across `apps/*`.
- Rationale:
  - best match for config-as-code mental model,
  - keeps `packages/*` meaning stable,
  - minimizes ceremony and ambiguous ownership.

## Capability-flat sparse plugin model: composition and sync impact

### Does it destroy "agent plugins compose toolkits"?
- Not inherently.
- Composition can still exist if we keep explicit plugin-to-plugin imports/dependencies and avoid hidden in-directory coupling.
- The risk is social/operational drift: teams may colocate everything and stop publishing reusable boundaries unless contracts enforce reuse.

### Would composition become easier or harder?
- **Authoring a single capability:** often easier (colocation).
- **System composition at HQ boundary:** can be harder unless manifest rules stay strict, because each capability can expose many optional surfaces and failure modes.
- Net effect: easier local development, potentially harder global governance unless manifest schema is strong.

### Sync model impact (current state vs required changes)
Current sync/discovery assumptions are root-split and kind-split today:
- workspace plugin discovery scans `plugins/{cli,agents,web}` roots,
- source scope filtering is `agents|cli|web`,
- plugin kind union is `toolkit|agent|web`,
- error/help strings and command UX mention `plugins/{cli,agents,web}`.

If capability-flat sparse model is adopted, these must be redesigned together:
- source plugin discovery and scope model,
- `rawr.kind` classification and related policy,
- sync filters (`--scope`) semantics,
- workspace/package manager patterns and docs contracts,
- runtime enablement identity model (capability-level vs surface-level),
- template/personal ownership manifests and guard rules.

Bottom line:
- composition is still possible,
- sync is not fundamentally blocked,
- but both require a deliberate contract rewrite, not an incremental tweak.

## Platform steward recommendation (explicit)
- **Recommendation:** keep **surface-split plugin roots** as the platform standard for this architecture cycle.
- **Do not adopt** capability-flat sparse plugin directories as the primary topology in this proposal.

Why this is the better fit for our stated goals:
- preserves sharp runtime boundaries and independent lifecycle/deployment per surface,
- keeps command-channel and policy semantics explicit (`rawr plugins ...` vs `rawr plugins web ...`),
- minimizes churn/risk in sync + ownership guard rails that are already contract-critical,
- protects composability by default (toolkits remain reusable artifacts, not implicitly bundled into larger capability containers),
- still supports domain growth by composition, without forcing monolithic plugin packaging.

How we still solve the colocation/growth pain (without topology inversion):
- add a **capability identity** across surface plugins (for example `rawr.capability: "<slug>"` in package metadata),
- scaffold multi-surface capability sets in one command (generate `cli/web/api/workflows/agents` siblings when desired),
- group by capability in `rawr.hq.ts` composition outputs for discoverability,
- keep explicit plugin-to-plugin composition/import contracts for agent/toolkit layering.

This gives us:
- the operational clarity of split surfaces,
- plus the authoring ergonomics of "one capability that can grow over time",
- without rewriting the sync/guard model in the same migration.

## Boundary reconciliation for current overlap

Concern:
- Today, some flows already blur boundaries (for example, workspace plugin discovery and `plugins web` operations currently enumerate all plugin roots, not only web-kind plugins).
- This does not invalidate the split-root architecture, but it means enforcement is incomplete and must be tightened.

### Clarified boundary model (primary vs adjunct)
- `rawr.kind` is the **primary executable contract**:
  - `toolkit`: oclif command plugin contract,
  - `web`: workspace runtime web/server contract,
  - `agent`: canonical agent-content contract (skills/workflows/scripts/agents).
- Cross-surface content is allowed only as **adjunct content**, not as primary runtime ownership transfer.
  - Example: toolkit `agent-pack/` content remains adjunct and is composed into agent surfaces via explicit import/compose rules.

### Why this resolves the pushback
- Yes, overlap exists.
- The fix is not topology inversion; the fix is to distinguish:
  - primary runtime contract (strictly enforced by kind/surface),
  - adjunct distributable content (explicitly composed, not implicitly executable everywhere).

### Enforcement changes required (to match intended boundaries)
1. Filter `plugins web list|enable|disable|status` to web-kind/runtime-surface plugins only.
2. Keep Channel A install/link convenience restricted to plugins declaring valid oclif contract; treat non-toolkit use as explicit exception, not default.
3. Preserve toolkit-to-agent composition through explicit compose metadata (for example `plugin.yaml` imports) instead of implicit root-wide assumptions.
4. Remove ad-hoc identifier special-cases in sync composition where possible; prefer declared composition intent in manifest/config.
5. Keep `rawr.hq.ts` as the only composition authoring surface so cross-surface wiring stays explicit and reviewable.

Result:
- boundaries stay crisp at runtime,
- composition remains powerful,
- overlap becomes intentional and governed instead of accidental and leaky.

## Architect's model-level assessment

### Are we fundamentally broken?
- No.
- We are in a **transitional mismatch** state: architecture intent is mostly coherent, but enforcement and metadata contracts lag the intended boundaries.
- Practical severity: medium architecture debt, not systemic failure.

### What model should we operate going forward?
- Treat the platform as three explicit concepts:
  1. **Capability** (business/problem ownership),
  2. **Surface plugin** (deployable runtime adapter per surface),
  3. **HQ composition graph** (`rawr.hq.ts`) as the only assembly authority.
- This preserves split-surface operations while still supporting "capability grows over time."

### How composition/split/growth should evolve
- Start with one surface plugin for a capability.
- Add sibling surface plugins as needed (`cli`, `web`, `api`, `workflows`, `agents`, `mcp`) tied by shared capability identity.
- Keep domain logic/contracts in packages and keep runtime adapters in plugins.
- Compose by capability groups in `rawr.hq.ts`, but execute by surface contracts.

### Is current proposal enough for long-term clarity?
- Directionally yes, but only if we add two simplification cuts beyond enforcement:
  1. **Capability identity contract** across surface plugins (for discoverability and composition grouping),
  2. **Primary-vs-adjunct contract** formalized in metadata (what a plugin executes vs what it merely ships for composition).

Without those cuts, agents still face avoidable ambiguity when deciding where behavior belongs.

### Agent understanding quality (target state)
- With only enforcement fixes: better, but still mixed mental models.
- With enforcement + the two cuts above: substantially simpler agent reasoning:
  - "Put logic in packages, put runtime in one surface plugin, wire in `rawr.hq.ts`, compose adjunct content explicitly."

### Contract redraw recommendation
- Keep topology.
- Perform a focused metadata/contract redraw to remove semantic overload:
  - separate **surface/runtime role** from **distribution channel** concerns,
  - retain existing channel invariants while making runtime ownership unambiguous for agents and tooling.

## Integration considerations
- `plugins sync` and agent plugin sync flows remain unchanged because surface ownership remains in `plugins/*`.
- Future "web carries its own skills" remains compatible: skills stay at surface/plugin boundary, domain logic remains in packages.
- CLI/web/agent/api/workflow/mcp can evolve independently per capability without mandatory coupling.
- To preserve template/personal boundary guard behavior, include `rawr.hq.ts` in template-managed path policy.
- Keep runtime composition ownership in template repo; operational plugin authoring remains personal-repo-first.

## Evidence gathered
- Repo docs:
  - `docs/SYSTEM.md`
  - `docs/system/PLUGINS.md`
  - `docs/process/PLUGIN_E2E_WORKFLOW.md`
  - `docs/process/GRAPHITE.md`
- Runtime and composition code:
  - `apps/server/src/index.ts`
  - `apps/server/src/rawr.ts`
  - `apps/server/src/orpc.ts`
  - `apps/server/src/plugins.ts`
  - `apps/web/src/ui/pages/MountsPage.tsx`
  - `apps/web/src/ui/lib/orpc-client.ts`
  - `packages/core/src/orpc/hq-router.ts`
- Skill references consulted:
  - `~/.codex-rawr/skills/orpc/SKILL.md`
  - `~/.codex-rawr/skills/inngest/SKILL.md`
  - `~/.codex-rawr/skills/elysia/SKILL.md`
  - `~/.codex-rawr/skills/turborepo/SKILL.md`
  - `~/.codex-rawr/skills/typescript/SKILL.md`
- Peer review inputs:
  - Integration reviewer and architecture reviewer both confirmed current baseline alignment and recommended explicit composition ownership for better day-to-day clarity.

## Open questions
1. Should `plugins/workflows/*` be first-class now, or remain served via central workflow package until operational pressure appears?
2. What is the ORPC contract versioning policy for multi-surface compatibility over time?
3. Do we want startup-only composition for API/workflow plugins initially, or invest in hot reconfiguration now?
4. Should `apps` remain named `apps`, or be renamed/nested as infrastructure once composition becomes centralized?

## Decision summary
- Adopt flat plugin-type runtime surfaces.
- Keep reusable logic/contracts in packages.
- Use one root composition manifest (`rawr.hq.ts`) so fixture apps remain thin.
- Treat this as a focused architecture clarification pass, not a full rewrite.
