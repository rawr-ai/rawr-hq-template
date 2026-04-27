# RAWR Competitive Brief — 2026-04-23

**Run kind:** scheduled `competitive-brief` (autonomous, no user in the loop)
**Scope:** RAWR HQ progress vs intended architecture, plus frontier-lab & adjacent-vendor activity that touches RAWR's canonical stack or the foundry altitude.
**Framing:** RAWR is a **software foundry** (app → manifest → role → surface; entrypoint → process → machine). This brief does not treat RAWR as an IDE / agent-pane / workflow builder. Competitive reads are per-vendor-slot or per-foundry-claim only.

---

## 1. Executive read

Three things happened in the last ~5 weeks that materially change the context RAWR operates in:

1. **Anthropic acquired Bun** (Dec 2 2025, now integrating). RAWR's canonical runtime is now owned by a frontier lab. This is a tailwind for Bun stability but a governance question for RAWR: the runtime vendor and the primary agent vendor are the same company.
2. **OpenAI's Agents SDK (Apr 15 2026) added sandbox execution + Codex-style harness + snapshot/rehydrate + native integrations with E2B, Daytona, Modal, Cloudflare, Vercel, Blaxel, Runloop.** This is not foundry-altitude — it's operator-surface — but it collapses the "agent runtime + sandbox" seam that OpenShell was supposed to uniquely own in RAWR's stack.
3. **NVIDIA released "OpenShell"** at GTC 2026 (Mar 16) as an Apache-2.0 agent runtime with policy engine + privacy router. Either this is the same OpenShell RAWR's canonical spec names (now matured out of alpha), or there is a direct name collision. Either resolution has meaningful consequences — one fixes RAWR's biggest stack risk; the other requires immediate renaming in the canonical spec family.

No frontier lab or adjacent vendor is operating at foundry altitude (`app → manifest → role → surface` with retargeting). The category is still RAWR's to claim. The pressure is on the individual vendor slots, not on the thesis.

---

## 2. RAWR HQ progress against intended architecture

### Milestone status

- **M1 (Phase 1):** closed, review-closed, frozen. The repo "tells one coherent semantic story again."
- **M2 (Phase 2) — Minimal Canonical Runtime Shell:** active but still mostly documentary. No `packages/runtime/*` exists in the tree yet; it lands in M2-U00.
- **Current working branch:** `codex/spike-oclif-cli-composition-20260420` — a research spike on how `rawr` (the CLI entrypoint) should compose oclif commands alongside the canonical app/manifest seam. Not on critical path for M2-U00, but directly feeds M2-U02 (compiler + process-runtime).

### What has actually shipped (verified from commit log)

The last ~40 commits are almost entirely **service-boundary hardening**, not runtime substrate work:

- Services now own their semantics: `agent-config-sync`, `hq-ops`, `session-intelligence`, `chatgpt-corpus`, `example-todo` all decomposed their God-routers, moved SQL into repositories, and kept discovery/orchestration in procedure handlers.
- `packages/hq-sdk/plugins` got a `bindService` seam as a pre-Effect staging area for future runtime-owned service binding.
- `@rawr/*-host` packages have been removed or quarantined as "not active architecture."
- The legacy `apps/hq/legacy-cutover.ts` still exists. It is the one sanctioned executable bridge M2-U00 is meant to delete.

This is the right order of operations: you cannot put a new runtime under services that don't respect their boundaries. But it also means **Phase 2 has not yet entered its load-bearing phase**. Nothing Effect-backed runs in the repo yet. The "real Phase 2 plateau" is not green.

### What's documented but not built

From `M2-minimal-canonical-runtime-shell.md` and the M2 execution context:

- `packages/runtime/substrate` (Effect-backed kernel with RuntimeConfig, ProcessIdentity, RuntimeTelemetry, DbPool, Clock, WorkspaceRoot, BoundaryCache) — **not created**.
- `packages/runtime/bootgraph` with real Effect-backed lowering and rollback — **reservation only**.
- `packages/runtime/compiler` (manifest → compiled process plan) — **reservation only**.
- `packages/runtime/harnesses/elysia` and `packages/runtime/harnesses/inngest` — **not created**.
- First canonical server slice + first canonical async slice through the new shell — **not landed**.

### Interpretation

RAWR is currently doing the unsexy, high-leverage work: making services actually own their semantics so that when Effect lands in M2-U00, it lowers into something real instead of memorializing the current mess. That is disciplined. It is also **slow relative to the external clock** — the exact weeks this service-hardening lane took are the weeks the rest of the ecosystem compressed several pieces of the stack that RAWR treats as distinct layers (see §3).

The spike on oclif CLI composition (currently in-flight) is important because if `rawr plugins` channel A and channel B stay clean, RAWR's ability to absorb external pressure via plugins (rather than via repo forks) is preserved. It is also a tell that the runtime-compiler seam is still being shaped in the mind of the architect, not just in code.

### Risks visible from the tree

- **M2-U00 has existed as a branch for weeks** (`agent-FARGO-M2-U00-replace-legacy-cutover-with-canonical-server-runtime`) and the entry conditions explicitly require it to be re-grounded against updated issue docs. That's a re-grounding cost already incurred, and the live implementation slice has still not landed.
- The `matei/reorganize-project-docs` branch has a WIP stash and untracked files. Documentation authority and execution authority are slightly out of phase.
- `deferrals.md` has "None recorded." Either the project has genuinely deferred nothing, or deferrals are leaking into issue docs and commit messages instead. Worth a `/mud` sweep before M2-U00 lands.

---

## 3. Vendor-slot landscape — what moved since 2026-04-16

Read this as "per RAWR canonical vendor slot, what happened, what it means."

### 3.1 Bun — **runtime slot**

- **What happened:** Anthropic acquired Bun on Dec 2 2025. Bun 1.3.12 is current. Claude Code ships as a Bun executable. Bun remains MIT-licensed. Pulumi added Bun as a first-class runtime in April 2026.
- **Impact on RAWR:** Tailwind for Bun performance/stability — it's now backed by a frontier-lab balance sheet, not VC anxiety. Bun's license stance is preserved, so the forbidden-list clauses in `RAWR_Vendor_Stack_Canonical.md` do not need to relax.
- **Where it bites:** Bun and Claude Code are now under the same roof. Any divergence between Bun-the-runtime and Claude-the-agent becomes a product-portfolio question rather than an ecosystem negotiation. If Anthropic ever ships "Claude-optimized Bun" features that are hard to reach from non-Anthropic agents, RAWR's agent role is hostage to a vendor-loyalty decision. This is a governance/architecture concern, not a code concern today.
- **Action:** no vendor swap; add an explicit line in the Vendor Stack spec that Bun's vendor identity is now Anthropic and that RAWR treats Bun as a runtime, not an agent-embedded runtime.

### 3.2 Effect — **runtime substrate slot**

- **What happened:** **Effect v4 beta** is out (April 2026). Complete rewrite of the fiber runtime. Bundle sizes drop from ~70 kB (v3) to ~20 kB (v4). Unified package system — all ecosystem packages share a single version. Seventeen "unstable" modules ship inside the core package, including `workflows`, `clustering`, `rpc`, `schema`, `sql`, `ai`, and `cli`. v4 will be the LTS release once stabilized; v3 stays on active maintenance.
- **Impact on RAWR:** Directly relevant to M2. The `RAWR_Effect_Runtime_Subsystem_Canonical_Spec` assumes v3-shaped APIs. M2-U00 is the moment Effect enters the repo as a real dependency. Landing on v3 beta-parity and then migrating to v4 is probably more expensive than pausing M2-U00 for a focused re-grounding read of the v4 betas.
- **The bundle-size swing is not decorative.** If `packages/runtime/substrate` is importable anywhere near `apps/web` (directly or via shared deps), a 50 kB floor difference shows up in browser payloads.
- **Action:** before M2-U00 lands, spike "v3 vs v4-beta for the substrate slice." The `effect@4-beta` `cli` and `workflows` unstable modules deserve specific evaluation — they overlap real RAWR surfaces (CLI command registry, async workflows).

### 3.3 Elysia — **server harness slot**

- **What happened:** Elysia 1.4.x (current stable) added pull-based backpressure and range headers for file/blob responses. Nothing architectural-grade has shifted in the last quarter.
- **Impact on RAWR:** None urgent. The `packages/runtime/harnesses/elysia` adapter target is still valid. Elysia remains Bun-first and schema-first.
- **Action:** none.

### 3.4 Inngest — **async runtime slot**

- **What happened:** Durable Endpoints are in public beta for Next.js and Bun. Inngest shipped **Agent Skills** — pre-built skills for Claude Code / Cursor / Windsurf covering `inngest-setup`, `inngest-events`, `inngest-durable-functions`, `inngest-steps`, `inngest-flow-control`, `inngest-middleware`. Realtime support for Python v0.5.9 landed. Inngest is a launch partner for Stripe Projects (agent-first stack bootstrap).
- **Impact on RAWR:** The RAWR async-runtime thesis (Inngest + `connect`-based worker, three-mode matrix) continues to be validated. The new **Agent Skills** shipped by Inngest are a direct prior art for RAWR's own `plugins/agents` directory — worth reading to decide whether RAWR's agent-role plugins should consume Inngest's canonical skills or wrap them.
- **Where it bites:** if RAWR's agent role ships its own Inngest guidance that diverges from Inngest's canonical skills, downstream HQ owners get two mental models. Better to rely on upstream Inngest skills and add RAWR-specific overlays only where the foundry claims (role parity, retargeting) require it.
- **Action:** add an issue to evaluate pulling Inngest's canonical Agent Skills into `plugins/agents/` as upstream-sourced rather than repo-authored.

### 3.5 Nx — **monorepo graph slot**

- **What happened:** Nx's 2026 roadmap explicitly positions Nx as "infrastructure for autonomous AI agents." Q1 2026 shipped: **code mode for better LLM context management**, a **Claude Code plugin** that ships LLM metadata with Nx plugins, specialized migration/codegen agents, **lazy graph hydration**, and **Self-Healing CI** that auto-fixes ~50% of CI failures.
- **Impact on RAWR:** Nx has started poaching altitude — "understanding your codebase and making architectural decisions alongside your team." That is adjacent-operator-surface territory, not foundry altitude, but it means Nx wants to be the thing agents talk to *about* the repo. RAWR's `packages/runtime/compiler` and bootgraph reach into the same semantic territory (manifest → process plan). They do not collide (Nx is build/graph; RAWR is runtime composition), but they will be asked to coexist by the same agents.
- **Where it bites:** if Nx's Claude Code plugin starts shipping authoritative LLM metadata for what a "project" is, that metadata has no concept of RAWR's `app → manifest → role → surface` ontology. Agents operating through it will see Nx projects, not RAWR apps. RAWR needs an equivalent metadata surface that agents can ask questions against, or Nx's framing will silently win at the agent-context layer.
- **Action:** medium priority — draft a spec for "RAWR agent metadata surface" that parallels Nx's Claude Code plugin. Do not ship it in M2, but scope it before M3.

### 3.6 OpenShell — **agent sandbox/shell slot** — **BIGGEST SIGNAL IN THIS BRIEF**

- **What happened:** On **March 16 2026 at GTC**, NVIDIA released **OpenShell** — an Apache-2.0 "safe, private runtime for autonomous AI agents" with a purpose-built sandbox, a policy engine governing filesystem/network/process layers, and a **privacy router** that keeps sensitive context on-device and only routes to frontier models when policy allows. It's bundled into the NVIDIA Agent Toolkit alongside NemoClaw. Claude Code, Codex, Cursor, and OpenCode run unmodified inside it.
- **Impact on RAWR — name collision / vendor identity question:** RAWR's canonical spec family refers to a component called "OpenShell" (`RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md`). The prior memory of this project flagged RAWR's OpenShell as **"alpha / single-player / proof-of-life"** and the biggest stack risk, with E2B and Daytona as production-ready escape-hatch harnesses. There are two possibilities and only two:
  - **(A) Same project.** NVIDIA's OpenShell is the matured, Apache-2.0 release of what RAWR's spec was already naming. This is the best possible outcome — the biggest stack risk has been resolved by a frontier hardware vendor releasing a production-grade open-source version. RAWR's spec needs to be updated to reflect vendor identity (NVIDIA) and the new three-component architecture (Sandbox, Policy Engine, Privacy Router).
  - **(B) Name collision.** RAWR's OpenShell is a different project with the same name. NVIDIA's release burns the name publicly. RAWR's spec family needs a rename before the docs ship externally, or anyone reading RAWR's specs will assume NVIDIA compatibility that does not exist.
- **Action — this week, before any further M2 doc work:** resolve A vs B. Read `RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md` against https://github.com/NVIDIA/OpenShell. If (A), update the spec with NVIDIA vendor attribution and re-evaluate whether OpenShell is still the biggest stack risk (probably not). If (B), pick a new name and renumber the specs.
- **Secondary impact:** NVIDIA's OpenShell ships a **privacy router** that routes inference by policy. That is the same concern RAWR's steward-activation spec addresses. If (A), RAWR inherits a real implementation. If (B), RAWR has a solved-problem competitor for an under-specified part of its own stack.

### 3.7 Electron — **desktop role slot**

- **What happened:** Electron continues its 8-week cadence; no architectural inflection. Desktop-AI-agent apps built on Electron + MCP are now normal (CodePilot, Paperclip, etc.), which validates RAWR's `RAWR_Desktop_Role_Canonical_Spec` bet on Electron-as-sole-desktop-harness.
- **Impact on RAWR:** tailwind. Tauri-vs-Electron 2026 comparisons still favor Electron for agent use cases because of Node/Chromium access parity.
- **Action:** none.

### 3.8 Railway — **deploy target slot**

- **What happened:** Nothing material. Railway continues to expand Bun deploy templates.
- **Action:** none.

### 3.9 PostgreSQL — **datastore slot**

- **What happened:** No relevant frontier-lab or vendor move.
- **Action:** none.

---

## 4. Adjacent-operator-surface pressure (not category competition, but context)

These are tools that sit on top of a foundry, not replace one. They are still relevant because they set the expectations agents and operators bring to RAWR.

### 4.1 Claude Agent SDK / Claude Code / Claude Plugins (Anthropic)

- Plugins are self-contained directories (`skills/`, `agents/`, `hooks/`, `mcp servers/`) with namespaced skills. **Official marketplace** is live at `marketplace.anthropic.com`, auto-available at startup.
- **Agent Skills spec** was released as an open standard in Dec 2025; OpenAI adopted the same format for Codex CLI and ChatGPT. Skills are the first real cross-vendor format for agent capabilities.
- **Claude Opus 4.7** shipped Apr 16 2026 with task budgets, high-res vision, and major SWE-bench gains. Priced same as 4.6 ($5/$25).
- **MCP** is now governed by the Agentic AI Foundation (Linux Foundation) after Anthropic's Dec 2025 donation. MCP registry has standardized `.well-known` metadata for server capability discovery, enterprise staging/quarantine flow.
- **Impact on RAWR:** The Claude Agent SDK `plugins/` convention, the open Agent Skills format, and MCP registry `.well-known` metadata are all **prior art for RAWR's own plugin channel A/B split**. RAWR's oclif spike is the moment to decide whether RAWR's plugin convention is a superset of the Claude Agent SDK plugin convention (so one directory can serve both) or a sibling. The foundry thesis survives either way, but "superset of Anthropic plugins" is the cheaper distribution story.

### 4.2 OpenAI Agents SDK + Codex Harness

- **Apr 15 2026 release:** sandbox execution built-in; apply_patch filesystem tools (Codex-style); snapshot+rehydrate container state; **native integrations with E2B, Daytona, Modal, Cloudflare, Vercel, Blaxel, Runloop**. Subagents and "code mode" are coming for both Python and TypeScript. Python first; TypeScript later.
- **Impact on RAWR:** The agent-operator-surface now has a canonical harness that auto-integrates with seven sandbox vendors. Anyone who wants "an agent that can run code safely on someone else's compute" has a reference stack without RAWR. **RAWR's differentiation is not the harness — it's the foundry.** The harness is a commodity now; what RAWR claims uniquely is that software can exit the foundry (the CapabilityBundle+retargeting thesis). That claim has gotten more important, not less, because the common-case "agent runs code in sandbox" story no longer needs RAWR at all.
- **Action:** de-emphasize "RAWR-as-agent-runtime" in positioning. Emphasize "RAWR-as-the-place-software-leaves-as-itself."

### 4.3 Durable-execution field (Temporal / Restate / DBOS)

- **Temporal raised $300M at $5B valuation Feb 17 2026**, 9.1T lifetime action executions, 1.86T from AI-native companies. Temporal is now an infrastructure primitive, not a framework. LangGraph, Pydantic AI, and OpenAI Agents SDK have all adopted durable-execution primitives natively.
- **Impact on RAWR:** Inngest is RAWR's canonical async runtime. Inngest is still the right choice at RAWR's altitude — Temporal is a cluster, Inngest is a service with cluster-grade semantics. The market signal confirms the category is load-bearing, not that RAWR chose wrong.
- **Action:** none to stack. But the positioning language in `RAWR_Async_Runtime_Canonical_Spec` should acknowledge durable-execution as a commodity primitive now, not a bet.

### 4.4 Agent frameworks (Mastra / LangGraph / CrewAI / Vercel AI SDK v6)

- **Mastra** (TypeScript-first agent framework) shipped MCP native support alongside CrewAI, Vercel AI SDK, and Microsoft Agent Framework in the last six months. Mastra bundles agents, workflows, memory, evals, observability.
- **Vercel AI SDK 6** introduced the `Agent` abstraction — define once, reuse across the app. 20M+ monthly downloads. `stopWhen` / `prepareStep` primitives are now stable.
- **Impact on RAWR:** Agent frameworks are a solved problem at the framework altitude. RAWR's agent role (6th peer role) is *not* a new agent framework — it's the RAWR-native projection of agent-capability-truth into runtime lanes. That distinction is now harder to explain because "agent framework" is such a crowded term. The Desktop/Agent/Role trilogy in the canonical specs needs a crisper one-liner that doesn't make a reader file RAWR under "yet another agent framework."
- **Action:** positioning revision pass on the agent-role specs before external circulation.

---

## 5. Foundry-altitude competitive scan — nobody is there

Web searches for "software foundry" at the capability-bundle + retargeting altitude return only:

- **Palantir Foundry** — data-integration platform, completely different category.
- **Microsoft Foundry** — Azure AI platform-as-a-service (models, agents, multi-agent workflows). Adjacent-operator-surface, not foundry altitude.
- **IDG Foundry** — B2B marketing platform.

**None of these claim the foundry thesis** (ontology preservation under placement change + industrialized boundary formation + CapabilityBundle+retargeting + Workstream System + role-parity peer-role extension).

Encore.ts is the closest adjacent framework at boundary-formation altitude, and the 2026 materials confirm its positioning — automatic infrastructure provisioning, Rust runtime, type-safe distributed systems. Encore is one altitude below RAWR: it's a framework for authoring boundaries. RAWR is a place where bounded things are born and leave. They are complementary, not competitive.

**The category is still RAWR's to claim.** The pressure is on individual vendor slots, not on the thesis.

---

## 6. Recommended action list, ordered by leverage

1. **Resolve RAWR OpenShell vs NVIDIA OpenShell this week.** Either matures RAWR's biggest stack risk into a solved problem or forces a rename. Single highest-leverage item in this brief.
2. **Effect v3 vs v4-beta decision before M2-U00 lands.** Landing on v3 and migrating to v4 is more expensive than spending ~2–3 days spike-evaluating v4's `cli`, `workflows`, and `schema` unstable modules now. The 50kB bundle-size difference alone justifies the pause.
3. **Ship M2-U00 narrowly.** The `agent-FARGO-M2-U00-*` branch has existed for weeks and been re-grounded once already. Every additional week of service-boundary hardening without landing the first canonical runtime slice is compounding context cost. The canonical stance ("RAWR owns semantic meaning. Effect owns execution mechanics. Boundary frameworks keep their jobs.") is correct *and* being asymptotically-approached rather than committed.
4. **Positioning revision pass** — "not an agent framework, not an agent runtime, not an IDE, not a workflow builder" — before any external circulation of the spec family. The surrounding ecosystem has compressed enough that the foundry thesis is now more distinct, but also easier to mis-file. This is a ~1-day doc pass, not a redesign.
5. **Plugin convention decision** — is RAWR's `plugins/` a superset of Claude Agent SDK plugins, or a sibling? Decide in the oclif spike window, not after. The spike will calcify the answer either way.
6. **Deferrals log hygiene.** `deferrals.md` says "None recorded." Run a `/mud` sweep on the project before M2-U00 lands to make sure deferred items aren't hiding in commit messages or issue docs.
7. **Inngest Agent Skills evaluation.** Low-priority, but worth adding an issue: should RAWR consume Inngest's canonical skills rather than authoring its own in `plugins/agents/`?
8. **Draft (not ship) a RAWR agent-metadata surface spec** that parallels Nx's Claude Code plugin, so when an agent asks "what is this repo?" the RAWR ontology answers first. Scope before M3, ship inside M3 if it passes a value-squeeze check.

---

## 7. What this brief did not cover

- No review of the `orpc-ingest-domain-packages` or `orpc-ingest-workflows-spec` project directories. If those are load-bearing for the M3 framing, a follow-up pass is warranted.
- No review of the `plugins/` tree contents or current skill inventory.
- No code-level read of the in-flight oclif spike (`docs/projects/rawr-final-architecture-migration/resources/research/oclif-cli-composition-spike/`). That spike deserves its own targeted review before it closes.
- No check of hiring/team-shape signals from Anthropic/OpenAI beyond product releases.

## Sources

Ecosystem & vendor slots:
- [Anthropic acquires Bun — Anthropic News](https://www.anthropic.com/news/anthropic-acquires-bun-as-claude-code-reaches-usd1b-milestone)
- [Bun is joining Anthropic — Bun Blog](https://bun.com/blog/bun-joins-anthropic)
- [Effect v4 Beta — Effect Documentation](https://effect.website/blog/releases/effect/40-beta/)
- [Effect v4 Beta: Rewritten Runtime — InfoQ](https://www.infoq.com/news/2026/04/effect-v4-beta/)
- [Elysia Releases — GitHub](https://github.com/elysiajs/elysia/releases)
- [Inngest Changelog](https://www.inngest.com/changelog)
- [Nx 2026 Roadmap — Nx Blog](https://nx.dev/blog/nx-2026-roadmap)
- [NVIDIA OpenShell — GitHub](https://github.com/NVIDIA/OpenShell)
- [NVIDIA OpenShell — NVIDIA Technical Blog](https://developer.nvidia.com/blog/run-autonomous-self-evolving-agents-more-safely-with-nvidia-openshell/)
- [OpenShell Redraws the Agent Control Plane — Futurum Group](https://futurumgroup.com/insights/openshell-redraws-the-agent-control-plane-open-standard-or-product-launch/)

Frontier labs & operator surfaces:
- [Introducing Claude Opus 4.7 — Anthropic](https://www.anthropic.com/news/claude-opus-4-7)
- [The next evolution of the Agents SDK — OpenAI](https://openai.com/index/the-next-evolution-of-the-agents-sdk/)
- [OpenAI Agents SDK harness + sandbox update — Help Net Security](https://www.helpnetsecurity.com/2026/04/16/openai-agents-sdk-harness-and-sandbox-update/)
- [Claude Code Plugins / Skills / Marketplace — Claude Code Docs](https://code.claude.com/docs/en/discover-plugins)
- [Plugins in the SDK — Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/plugins)
- [MCP 2026 Roadmap — Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)

Durable execution, agent frameworks, adjacent frameworks:
- [Temporal.io](https://temporal.io)
- [Durable Execution: Temporal vs Restate vs DBOS — Dev Note](https://devstarsj.github.io/2026/04/03/durable-execution-temporal-restate-dbos-distributed-workflows-2026/)
- [Mastra AI Complete Guide 2026](https://www.generative.inc/mastra-ai-the-complete-guide-to-the-typescript-agent-framework-2026)
- [AI SDK 6 — Vercel](https://vercel.com/blog/ai-sdk-6)
- [oRPC v1.0 Announcement — unnoq](https://orpc.unnoq.com/blog/v1-announcement)
- [Encore.ts — TypeScript Backend Framework 2026](https://encore.dev/articles/best-typescript-backend-frameworks)

Sandbox providers (reference only, no direct action):
- [E2B vs Daytona 2026 — Northflank](https://northflank.com/blog/daytona-vs-e2b-ai-code-execution-sandboxes)
