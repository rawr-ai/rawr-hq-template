---
title: RAWR HQ — Progress + Competitive Brief (2026-04-16)
author: scheduled-task:competitive-brief
scope: rawr-final-architecture-migration
type: dated-brief
revision: 2 (reframe from IDE/agent-pane axis to foundry axis)
---

# RAWR HQ — Progress + Competitive Brief (2026-04-16)

> **Reframe note.** An earlier version of this brief measured RAWR against IDE
> and agent-pane tools (Cursor, Amp, Devin, Warp, Zed, n8n, AgentKit canvas).
> That was a category error. RAWR is a **software foundry** — a bounded place
> where software is *born under shared law, hardens under shared observation,
> and leaves only when it can remain itself outside the room that raised it*.
> The canonical ontology is `app → manifest → role → surface`, the canonical
> realization chain is `entrypoint → runtime compiler → bootgraph →
> process runtime → harness → process → machine`, and the canonical
> transportable unit is the `CapabilityBundle + TargetProfile + Retargeter +
> DestinationVerifier + BenchmarkEpoch` quintuple. This brief measures
> competition at the right altitude: **per vendor slot** in RAWR's canonical
> stack, and **per foundry claim** on the market.

## TL;DR

- **Progress:** M1 closed as a real plateau. Phase 2 regrounded today
  (2026-04-16) with commits `e1336041` + `57e3ca6e`. `apps/hq/legacy-cutover.ts`
  is still the one live executable bridge — it carries the boot path for
  `server` and `async` and is imported from four files in two apps. **M2-U00
  has not started.** Until it does, "Phase 2 is underway" is docs, not code.
- **Competitive read at the right altitude:** No vendor challenges RAWR's core
  foundry claims. The four singular claims — *ontology preservation across
  scale*, *industrialized boundary formation*, *CapabilityBundle +
  retargeting*, *Workstream System as durable coordination primitive* — have
  no category competitor. Encore.ts is the nearest *adjacent* framework in
  boundary formation, but it operates at framework altitude (one deployable
  unit), not foundry altitude (an opinionated factory that manufactures many
  deployables under shared law).
- **Where RAWR is actually exposed:** at **vendor slots**, not at the foundry
  thesis. The biggest stack risk remains **OpenShell (alpha, single-player,
  proof-of-life)**. E2B (Firecracker microVMs, ~150ms cold start) and Daytona
  (Docker workspaces, sub-90ms, stateful) are production-ready escape hatches
  that should be documented as fallback harnesses, not substitutions.
- **Strategic read:** RAWR's defensibility is *below* the layer every new
  entrant is crowding (editor panes, agent canvases, durable agent loops).
  Those are adjacent operator surfaces. RAWR is the place where the
  composition that survives them lives. That is a stronger position than the
  previous brief framed — and it is only real if the substrate exists.

---

## Part A — Progress vs. Intended Architecture

### Where we are on the map

The stable target is `app → manifest → role → surface`. The runtime
realization is `entrypoint → runtime compiler → bootgraph → process runtime →
harness → process → machine`. Operational placement is `entrypoint →
platform service → replica(s)`. The six canonical peer roles are *server*,
*async*, *web*, *cli*, *agent*, *desktop*. None of this has drifted.

What moved today:

**M1 closed cleanly.** `phase-1-closeout-review.md` certifies Phase 1
materially intact. HQ operational truth lives in `services/hq-ops`. The
canonical shell at `apps/hq` has `rawr.hq.ts`, `server.ts`, `async.ts`,
`dev.ts`. Canonical plugin roots exist: `plugins/server/api/{example-todo,
state}`, `plugins/async/{workflows,schedules}`. One sanctioned executable
bridge remains: `apps/hq/legacy-cutover.ts`.

**Phase 2 docs regrounded today (2026-04-16).** Two same-day commits —
`e1336041` ("docs: reground Phase 2 migration for Effect runtime substrate")
and `57e3ca6e` (canonical architecture docs updated) — make two moves that
matter:

1. `packages/bootgraph` → `packages/runtime/bootgraph`. The runtime package
   *family* replaces the single package. Substrate, bootgraph, harnesses,
   and context are all siblings under `packages/runtime/*`.
2. `packages/runtime-context` is slated for absorption into
   `packages/runtime/substrate`. Effect becomes a real dependency **only
   inside substrate**, and is explicitly forbidden from leaking through the
   public API. The canonical stance — *"RAWR owns semantic meaning. Effect
   owns execution mechanics."* — is load-bearing here.

**M2 plan exists, M2-U00 is pending.** The milestone sequences 7 slices
(M2-U00 → M2-U06) with M2-U00 as the domino. The scope is coherent, the
acceptance criteria are specific (RuntimeConfig, ProcessIdentity,
RuntimeTelemetry, DbPool, Clock, WorkspaceRoot, BoundaryCache — all Effect
services under substrate, none leaking out; `defineApp()`, `startAppRole()`,
`lowerModule()` as the RAWR-shaped public API; Elysia harness as a thin
adapter). Verification scripts are spelled out
(`verify-no-legacy-cutover.mjs`, `verify-server-role-runtime-path.mjs`,
`verify-effect-not-in-public-api.mjs`). The slice is buildable. What is
missing is execution — zero code commits on it yet.

### What the bridge is actually hiding

The prework inside M2-U00 is unambiguous. The executable bridge is load-
bearing across these surfaces:

- `apps/hq/server.ts`, `apps/hq/async.ts`, `apps/hq/dev.ts` all import from
  `./legacy-cutover`.
- `apps/hq/src/index.ts` re-exports `../legacy-cutover`.
- `apps/hq/package.json` still publishes `./legacy-cutover`.
- `apps/server/src/rawr.ts` imports `createRawrHqLegacyRouteAuthority` from
  `@rawr/hq-app/legacy-cutover`.
- `createHostInngestBundle(...)` and `registerRawrRoutes(...)` derive runtime
  surfaces from the legacy authority.
- `packages/bootgraph/src/index.ts` is only a reservation constant, awaiting
  replacement by `packages/runtime/bootgraph/`.
- `packages/runtime-context/src/index.ts` is still a type-only support seam,
  not a boot path.

M2-U00 is not a single-file change. It is a coordinated cut across seven
files/directories, and it installs the first Effect dependency in the repo.
This is exactly the kind of slice that fails silently if the substrate
surface is under-sized or the `lowerModule()` bridge leaks Effect types.

**Manifest reality check.** `apps/hq/rawr.hq.ts` still declares only `server`
and `async` roles. The other four canonical peer roles — *web*, *cli*,
*agent*, *desktop* — are not installed at the manifest level. That is
correct for this plateau, but it bears naming: Phase 2 is about *runtime
substrate*, not *role expansion*. Role-parity work (especially the desktop
role, which landed as a 6th peer role in the integrated architecture spec
with Electron as the sanctioned harness) is downstream of M2 finishing.

### Active risks (from `triage.md` and what's visible)

1. **Pre-existing `lint:boundaries` failure** in `apps/server` baseline.
   Logged as a risk, declared out-of-scope for M1-U00 guardrails. M2-U00
   touches `apps/server/src/rawr.ts` and `apps/server/src/bootstrap.ts`.
   This failure will either block M2-U00 verification or force a scope
   expansion mid-slice. **Recommend:** clean it before M2-U00 starts, not
   during.
2. **Substrate undersizing.** The Implementation note in M2-U00 enumerates
   what example-todo and hq-ops need at boot (`DbPool`, `Clock`, `Logger`
   via RuntimeTelemetry, `Analytics` via RuntimeTelemetry, `workspaceId`
   and `repoRoot` via WorkspaceRoot, `RuntimeConfig`, `ProcessIdentity`,
   `RuntimeTelemetry`, `BoundaryCache`). That list is exhaustive only if no
   hidden boot-time dependency exists in the current
   `legacy-cutover.ts → host-composition.ts` chain. A pre-implementation
   grep pass on what `host-composition.ts` actually requires is cheap
   insurance.
3. **Effect-in-public-API leakage.** The substrate uses `ManagedRuntime`,
   `Layer`, `Effect.Service` internally. The `lowerModule()` bridge is the
   one seam where leakage is easiest. The verification script
   (`verify-effect-not-in-public-api.mjs`) will catch type-level leaks but
   probably not accidental Effect-flavored *runtime* shapes (error channel
   semantics, fiber observability). **Recommend:** define the RAWR-shaped
   error return type before writing `lowerModule()`, not after.

### Progress read, in one sentence

Phase 1 is a real plateau, not a paper one. Phase 2 is correctly scoped but
has moved forward zero commits of code since the regrounding docs landed
today. The next useful action is M2-U00; everything else is waiting.

---

## Part B — Competitive Landscape, at the Right Altitude

The question is not "who else has an agent pane." The question is: *at
which of RAWR's vendor slots does the landscape exert pressure, and which
of RAWR's foundry claims does anyone else even try to make?* Two frames:
**per vendor slot** and **per foundry claim**.

### B.1 — Per vendor slot (pressure on RAWR's canonical stack)

RAWR's canonical stack is a discipline, not a menu. Each slot has a
canonical choice, a tension profile, and an implicit substitution cost. The
scan below measures whether the ecosystem has produced new pressure on each
slot since the last brief.

**Runtime kernel — Effect (foundation, v4).**
The M2-U00 dependency. No credible challenger at this altitude in
TypeScript. fp-ts is effectively in maintenance. Effect v4 is stable enough
to commit to. **Pressure on slot:** none. **RAWR posture:** adopt the bare
kernel (ManagedRuntime / Layer / Effect.Service), refuse Effect's public
boundaries (HTTP / RPC / Workflow / Cluster / CLI), police the seam.

**Service boundary — Elysia (default) + oRPC (foundation).**
Hono and Fastify are commodity alternatives; nothing new shifted. Elysia
stays default because Bun-first + schema-driven + Eden type-safety align
with RAWR's existing type conventions. oRPC remains foundation because
contract-first + dual transports is load-bearing for foreign-destination
retargeting. **Pressure on slot:** none. **RAWR posture:** hold.

**Durable async — Inngest (foundation), `connect`-based worker.**
The canonical async decision (per `RAWR_Async_Runtime_Canonical_Spec.md`):
HQ async worker is *always* Inngest-backed and *always* `connect`-based;
modes vary only in control-plane destination (local Dev Server / Inngest
Cloud / self-hosted Inngest). Tailscale is operator access, not worker
transport. **New pressure:**
- **Restate** is the cleanest conceptual alternative — it makes
  *distributed durable async/await* explicit, log-based, with a single
  binary. Philosophically closest to "RAWR owns semantic meaning." **Not a
  substitute at M2-U00** — foundation slot replacement is highest-cost,
  and Restate's cluster/operator story is younger.
- **Temporal** shipped the Durable AI Agent Bundle (agent loop as workflow,
  tools as activities, interruption as signal). Cleanest external reference
  for what a correctly-shaped durable agent loop looks like — worth reading
  before designing the async-harness agent protocol. Not a substitute
  (Temporal requires cluster; Inngest aligns with RAWR's local-first single-
  binary posture).
- **Trigger.dev / Hatchet** are commodity competitors at framework altitude.
  Nothing structural.
- **Inngest Durable Endpoints** (new since last scan) map cleanly to the
  async harness surface planned at M2-U03.
- **Known tension:** self-hosted Inngest `connect` is documented as "in
  development." If it slips, the canonical matrix collapses to *{local Dev
  Server | Inngest Cloud}*. Watch, don't act.
**RAWR posture:** hold Inngest. Track Restate as the canonical reference
alternative. Read Temporal's bundle as design input.

**Shell / compute substrate — OpenShell (foundation, alpha).**
The biggest risk in the canonical vendor stack. OpenShell is explicitly
alpha, single-player, proof-of-life. The Agent Runtime spec names this
directly. Meanwhile the ecosystem has shipped **production-ready** adjacent
products:
- **E2B** — Firecracker microVMs, ~150ms cold start, hardware-level
  isolation per LLM code execution. Production-grade for untrusted agent
  code.
- **Daytona** — Docker containers, sub-90ms cold start, stateful persistent
  workspaces. Developer-workspace perspective.
- **Modal / Fly Machines** — tangential; not positioned for agent-exec.
**RAWR posture:** OpenShell stays canonical by the spec's explicit
governance decision. But document E2B and Daytona as *escape-hatch
harnesses* — if OpenShell doesn't mature, the shell/substrate slot must
remain swappable. The forbidden lists in the OpenShell spec (shell = not
control plane, not devplane, not second business execution plane) still
apply to any alternative.

**Agent network — AgentKit (companion).**
Canonical companion per the vendor-stack doc. **New pressure:**
- **Mastra** (Feb 2026) shipped "observational memory" — two background
  agents compress old messages into dense structured observations. This is
  an *agent-internal* durability primitive, not a coordination primitive.
- **LangGraph** durable execution: graph-based checkpointing at every node
  transition. Again, durable agent state, not durable *coordination*.
Both are *durable agent* primitives. Neither is a *durable coordination*
primitive. The distinction matters: RAWR's Workstream System (durable
charter / evidence / control / execution inputs with typed status lattice)
operates one level up — the thing that spans multiple agents, multiple
runs, multiple humans, over weeks. Nothing in the scan touches this.
**RAWR posture:** AgentKit stays companion. Mastra and LangGraph are
implementation references for in-agent state primitives, not threats.

**Monorepo — Nx (default).**
Unchallenged at scale. Turborepo is the commodity alternative; nothing new.
**New pressure:** Nx shipped `nx configure-ai-agents` in 2026, which
provisions Skills + MCP + CLAUDE.md-style guidance across Claude Code,
Cursor, Copilot, Gemini, Codex, OpenCode. This touches `plugins/agents`
territory. **RAWR posture:** hold Nx, but decide the boundary with
`nx configure-ai-agents` explicitly. Leaning *compose on top* — Nx
generates scaffolding; RAWR adds the runtime/boundary/role surface Nx does
not own. Governance principle: *Nx is servant, not sovereign.*

**Desktop harness — Electron (sanctioned, sole).**
The desktop role is the 6th canonical peer role (menubar / windows /
background surfaces). Electron is the sole sanctioned harness.
**New pressure:**
- **Tauri v2** has system-tray + menu API parity for menubar apps. Rust
  runtime + WebView. A capability equivalent exists now.
- **React Native macOS** remains governance-rejected by the Desktop Role
  spec.
The capability gap to Tauri is closed. The governance decision is not. Per
the spec, reopening Tauri requires an explicit governance event, not a
capability argument. **RAWR posture:** hold Electron. The Tauri parity
signal strengthens the "this is a governance choice, not a capability gap"
framing.

**Deployment — Railway (default) + PostgreSQL (default).**
Railway now supports Bun monorepos natively with per-package service
staging — matches the stack exactly. Not a foundation slot. **RAWR
posture:** Railway stays default. A one-command deploy path for personal
HQ becomes shorter to document, but only after M2 plateau.

### B.2 — Per foundry claim (pressure on RAWR's thesis)

The scan below maps RAWR's singular claims against whoever else in the
industry is trying to make the same claim, at any altitude.

**Claim 1 — Ontology preservation across scale.**
*`app → manifest → role → surface` is stable from the smallest single-role
app to the largest multi-role HQ. The same manifest grammar describes both.
No reshaping required to grow.*

Nobody else attempts this. Framework-altitude tools (Encore.ts, NestJS,
Next.js) have their own ontologies but are flat at one scale. Monorepo
tools (Nx, Turborepo) offer *project shape* but not *role/manifest
semantics*. Platform tools (Railway, Vercel, Fly) offer *deployment shape*
but not *domain ontology*. **Competitive status:** no category competitor.

**Claim 2 — Industrialized boundary formation.**
*Boundaries (package / service / plugin / app / role) are first-class,
enforceable artifacts. Creating a new boundary is a mechanical action
under shared law, not a bespoke design session. Code-as-source-of-truth.*

The nearest adjacent is **Encore.ts** (framing is aggressive in 2026:
"infrastructure from code"; service calls look like function calls; Encore
generates type-safe clients, handles service discovery, correlates
distributed traces; application code is source of truth; no state file;
infrastructure changes ship in the same commit as application changes).
This is the closest thing to RAWR's boundary-formation claim that anyone
else ships.

**Why Encore is adjacent, not competitor:**
- Encore is **framework altitude**. One deployable unit, one boundary model
  (service). RAWR is **foundry altitude**: many deployables, multiple role
  kinds (six), three artifact kinds (packages / services / plugins), one
  composition authority (apps).
- Encore has no *lifecycle* (incubate → harden → promote → extract →
  evolve). Boundaries form once and stay put.
- Encore has no **CapabilityBundle export** — no theory of how a capability
  leaves the framework while remaining itself.
- Encore has no **peer-role extension** (adding a 7th role kind via the
  same grammar as the other six).

**Implication:** Encore is the cleanest *framework*-altitude precedent for
industrialized boundary formation. A short RAWR positioning doc that says
"RAWR is to Encore as a factory is to a machine" would be honest and
clarifying — and would keep the Encore audience from miscategorizing RAWR
as a competing framework.

**Claim 3 — CapabilityBundle + TargetProfile + Retargeter +
DestinationVerifier + BenchmarkEpoch (source-side certainty for foreign
destinations).**
*RAWR manufactures transferable certainty: a capability leaves RAWR
accompanied by a portable verifier, a mappable verifier, and a
destination-local verifier that must be established before acceptance. "The
foundry does not need to colonize every destination. It only needs to be
the best place to manufacture transferable certainty."*

Nobody else attempts this. Docker/OCI ship *artifact* portability without
semantic preservation. Terraform/Pulumi ship *infrastructure* portability
without capability semantics. Encore ships *service* portability within
Encore. npm ships *code* portability without runtime or semantic
guarantees. The entire cluster of "agent export" tools (AgentKit,
LangGraph Platform, Mastra Cloud) ships *hosted* endpoints, which is the
opposite of source-side certainty. **Competitive status:** no competitor.
This is RAWR's most singular claim.

**Claim 4 — Workstream System (durable reactive coordination primitive).**
*A first-class primitive distinct from session / thread / run / workflow /
worktree / project. Typed input classes (charter / evidence / control /
execution), typed workstream shapes (RetargetingWorkstream, etc.), full
status lattice (opened → planned → running → awaiting-review → verifying →
accepted | escalated | abandoned), event envelope with ContextTarget union
(open / plan / run / review / handoff / human-summary).*

The ecosystem has durable *workflows* (Temporal / Inngest / Restate) and
durable *agents* (LangGraph / Mastra). Nobody has durable *coordination
workstreams* with typed charter/evidence/control/execution input split,
explicit status lattice, and ContextPack compilation.

**Naming collision flagged:** *Primitive* (launched April 14, 2026) is an
AI Agent Operating System for regulated financial institutions with an
"Agent Capital / ROAC" framing. This is a **naming collision, not a
category collision** — FI governance OS vs. coordination primitive. Worth
noting in RAWR's public docs to avoid brand confusion. **Competitive
status:** no category competitor.

**Claim 5 — Role-parity peer-role extension.**
*New peer roles (desktop as the 6th; the next one, when it comes) install
through the same manifest grammar, same runtime compiler, same boundary
law, same CapabilityBundle export. Adding a role is a mechanical event,
not a rewrite.*

Nobody else attempts this. Frameworks add "modes" (Next.js: pages / API /
server actions / edge). Platforms add "resource types" (Vercel / Railway /
Fly). Neither is a peer-role extension under a stable grammar.
**Competitive status:** no competitor.

### B.3 — Adjacent operator surfaces (not category competitors)

The tools the earlier brief mis-categorized as direct competitors are real,
well-funded, and active in the market — but none of them make a foundry
claim. They are adjacent operator surfaces. A correct read:

- **Cursor 3 Agents Window / Cognition-Devin / Sourcegraph Amp / Warp Oz /
  Zed multi-agent panel** — editor-pane or terminal-pane surfaces where an
  operator invokes agents against a repo. These **sit on top of** a
  foundry. RAWR can (and eventually should) ship integrations that let its
  capabilities be invoked from these surfaces. But the foundry is *where
  the composition lives*; these are *where the composition gets invoked*.
- **OpenAI AgentKit Agent Builder visual canvas** — counter-paradigm to
  *code-first composition*. The argument against it is not feature parity;
  the argument is durability. A visual canvas is a UI on top of some
  workflow engine; RAWR is a *composition substrate*. Canvases are
  buildable from RAWR; RAWR is not buildable from a canvas.
- **n8n self-hosted AI starter kit** — visual workflow tool + local
  AI stack. Same local-first narrative slice; different architectural
  depth. Competes for mindshare with non-technical operators, which isn't
  RAWR's user.
- **LocalAI / Team9 / Hermes-style local workbenches** — app-shaped tools
  on top of Ollama. Compete for attention, not architecture.

These should be **named and excluded** in RAWR's public positioning, not
left implicit. The risk is that anyone unfamiliar with the foundry thesis
reflexively lumps RAWR in with these. The distinction is not subtle; it
just needs to be stated.

### B.4 — Terrain shifts worth noting

- **Agent Skills cross-platform spec.** Anthropic's Skills convention is
  now adopted in some form by OpenAI Codex, Google Antigravity, Vercel
  (`skills.sh`), Cursor, GitHub Copilot. A skill authored for Claude runs
  unchanged across most of this set. **Implication for RAWR:** if
  `plugins/agents/tools` and `plugins/agents/channels` adopt the Skills
  spec as their *authoring* format (not invent a RAWR-local format), every
  ecosystem skill becomes RAWR-installable and every RAWR-authored skill
  becomes portable. This is a plug-in decision, not a competitive one.
- **MCP governance → Linux Foundation / Agentic AI Foundation.** MCP is
  now neutral infrastructure. Every MCP server works with every MCP-
  speaking client. Makes `plugins/agents/tools/machine-read` — and any
  other MCP-adjacent plugin kind RAWR eventually ships — cheaper to commit
  to, not more expensive.
- **ACP (Agent Client Protocol, Zed → JetBrains).** Stdio JSON-RPC for
  in-editor agents. Low-urgency watch — adopt only when there is a
  specific surface that benefits (e.g., exposing RAWR commands to Zed's
  agent panel).
- **"Local-first" term is being claimed widely.** Warp, Windsurf, LocalAI,
  n8n, and others all market "local-first." RAWR's specific meaning — *the
  workspace is the source of authority and the source-side of certainty* —
  is architecturally stronger. Defend the definition in docs.

---

## Part C — Actions and Watch Items

### Actions (within RAWR's control)

1. **Start M2-U00.** Nothing here changes strategically until the bridge
   is deleted. Clean the pre-existing `lint:boundaries` failure in
   `apps/server` *before* starting, not during.
2. **Document the OpenShell escape-hatch posture.** OpenShell's alpha /
   single-player / proof-of-life status is already named in the vendor
   stack as the biggest risk. Add a short note in `docs/system/` that names
   **E2B (Firecracker microVMs) and Daytona (Docker workspaces)** as the
   production-ready escape-hatch harnesses if OpenShell does not mature —
   *as harnesses, not substitutions.* The shell-role forbidden list (not
   control plane, not devplane, not second business execution plane)
   applies to any alternative.
3. **Document Restate as canonical reference for the durable-execution
   slot.** Inngest stays the foundation choice. But Restate's log-based
   distributed-durable-async/await philosophy is the cleanest external
   reference the ecosystem has produced. A short note under
   `docs/system/async/` that names it as the comparison point hardens the
   vendor decision.
4. **Decide on Skills spec adoption for `plugins/agents/*`.** Binary. If
   yes, lock the authoring format to the cross-platform spec and make
   RAWR's value-add the *composition* (manifest, runtime, boundaries), not
   the authoring syntax. If no, document why — there should be a specific
   reason.
5. **Decide on Nx agent-generator relationship.** Document the boundary
   between `nx configure-ai-agents` and `plugins/agents`. Leaning *compose
   on top* — Nx generates scaffolding; RAWR adds the runtime/boundary/role
   surface Nx does not own.
6. **Write the "RAWR is a foundry, not a framework" positioning doc.** One
   page. Names the adjacent categories (editor panes, visual canvases,
   frameworks) and why the foundry category is distinct. Prevents the
   mis-categorization this brief just had to correct.

### Watch items (no action, just tracking)

- **Inngest Durable Endpoints** → relevant at M2-U03.
- **Inngest self-hosted `connect`** status → relevant to the async-
  canonical matrix; if slipping, the matrix collapses.
- **Temporal Durable AI Agent Bundle** → reference material for async
  harness agent-loop protocol design.
- **Restate release cadence** → reference alternative at the durable-
  execution slot.
- **OpenShell maturation cadence** → if it stabilizes, the escape-hatch
  note can be retired; if it stalls, the escape hatch becomes load-
  bearing.
- **Encore.ts adoption + public framing** → nearest adjacent at framework
  altitude; their language choices affect how RAWR's positioning reads.
- **Agent Skills spec evolution** (`skills.sh`, Cursor, Codex variants) →
  decision input for `plugins/agents/*` authoring format.
- **Effect v4 minor releases** → no upgrades until M2-U00 ships.
- **"Primitive" (FI AI Agent OS, launched 2026-04-14)** → naming collision
  only; watch for any cross-traffic in public docs.

### What explicitly does *not* matter yet

- **AgentKit visual canvas feature parity.** Counter-paradigm; not a
  target.
- **MCP registry UX.** Plugin concern, not core.
- **Local AI workbench tool features.** Different market.
- **Railway Bun monorepo deploy templates.** Shortest-path deploy; only
  relevant after M2 plateau.
- **Tauri v2 menubar parity.** Capability parity exists; governance
  decision to reject stands; reopening requires a governance event, not a
  technical one.

---

## Appendix — Sources & Evidence

### Internal canonical docs (authoritative; mounted at
`/Users/mateicanavra/Documents/projects/RAWR/`)

- `RAWR_Integrated_Architecture.md` — canonical foundry thesis; ontology;
  realization chain; role/surface/manifest grammar.
- `RAWR_Workstream_System_Canonical_Spec.md` — Workstream primitive;
  typed input classes; status lattice; event envelope; ContextTarget
  union.
- `RAWR_Vendor_Stack_Canonical_Spec.md` — canonical stack; tensions;
  forbidden lists; OpenShell alpha risk.
- `RAWR_Desktop_Role_Canonical_Spec.md` — 6th peer role; Electron
  sanction; Tauri/RN-macOS rejection.
- `RAWR_Async_Runtime_Canonical_Spec.md` — Inngest + `connect` canonical
  decision; three-mode matrix; operator access vs worker transport split.
- `RAWR_Factory_Bundle_Export_Spec.md` — CapabilityBundle + TargetProfile
  + Retargeter + DestinationVerifier + BenchmarkEpoch; RetargetingWorkstream
  TS interface; acceptance rule.
- `RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md` —
  agent-role split (channels / shell / tools); process split; shell
  forbidden list; builder families.

### Internal template repo (as of 2026-04-16)

- `docs/SYSTEM.md` — architecture spine in-repo.
- `docs/projects/rawr-final-architecture-migration/phase-1-closeout-review.md`
  — M1 certification.
- `docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md`
  — full M2 plan (M2-U00 → M2-U06).
- `docs/projects/rawr-final-architecture-migration/issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md`
  — next issue, pending execution.
- `docs/projects/rawr-final-architecture-migration/triage.md` — open risks
  (pre-existing `lint:boundaries` failure).
- `apps/hq/rawr.hq.ts` — manifest currently declares server + async only.
- `apps/hq/{server,async,dev}.ts` + `apps/hq/src/index.ts` +
  `apps/server/src/rawr.ts` — all still import from `legacy-cutover`.
- Git: most recent commits `bc0cb123`, `e1336041`, `57e3ca6e`, `b56cc8e7`,
  `f8fc9ca1` (Phase 2 regrounding landed 2026-04-16).

### External (web scan at corrected axes, 2026-04-16)

**Durable-execution slot:**

- Restate (log-based distributed durable async/await) — cleanest external
  reference for the slot.
- Temporal Durable AI Agent Bundle — agent loop as workflow.
- Inngest Durable Endpoints — maps to M2-U03 async harness.
- Trigger.dev / Hatchet — commodity competitors at framework altitude.

**Shell / compute substrate slot:**

- E2B (Firecracker microVMs, ~150ms cold start) — production-ready
  alternative; escape-hatch candidate.
- Daytona (Docker containers, sub-90ms, stateful workspaces) — production-
  ready alternative; escape-hatch candidate.

**Agent network slot:**

- Mastra observational memory (Feb 2026) — agent-internal durability
  primitive.
- LangGraph graph-based checkpointing — agent-internal durability
  primitive. Neither is a coordination primitive.

**Framework-altitude boundary formation (adjacent to Claim 2):**

- Encore.ts 2026 framing — "infrastructure from code"; type-safe service
  calls; code as source of truth; no state file. Closest adjacent at
  framework altitude; not a foundry.

**Ecosystem shifts:**

- Agent Skills cross-platform adoption (Anthropic → Codex → Antigravity →
  Vercel `skills.sh` → Cursor → Copilot).
- MCP governance → Linux Foundation / Agentic AI Foundation.
- Nx `configure-ai-agents` command.
- ACP adoption beyond Zed (JetBrains in flight).
- Tauri v2 menubar/tray parity with Electron (governance-only gap now).
- "Primitive" (2026-04-14, FI AI Agent OS) — naming collision only.

**Adjacent operator surfaces (named and excluded; *not* category
competitors):**

Cursor 3 Agents Window, Cognition-Devin + Windsurf, Sourcegraph Amp, Warp
Oz, Zed multi-agent panel, OpenAI AgentKit Agent Builder visual canvas,
n8n self-hosted AI starter kit, LocalAI / Team9 / Hermes-style local
workbenches.

*Brief generated by the scheduled `competitive-brief` task. Re-run cadence
visible via `mcp__scheduled-tasks__list_scheduled_tasks`.*
