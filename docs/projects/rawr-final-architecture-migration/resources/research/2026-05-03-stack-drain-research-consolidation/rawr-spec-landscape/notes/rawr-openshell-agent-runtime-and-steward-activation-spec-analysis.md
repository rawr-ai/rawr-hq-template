---
title: RAWR OpenShell Agent Runtime and Steward Activation — spec analysis
id: rawr-openshell-agent-runtime-and-steward-activation-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:35:10.756627Z'
updated: '2026-05-01T21:10:18.761389Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_OpenShell_Agent_Runtime_and_Steward_Activation_Spec_Final.md
- runtime_authority: no

## Scope and purpose

This spec defines the canonical OpenShell subsystem for RAWR HQ — the human-facing `agent` role's runtime substrate, its messaging/gateway posture, the explicit split between conversational shell authority and durable steward execution authority, and the rules for how a trusted operator's shell may inspect the machine and delegate governed work. It fixes the surfaces inside the `agent` role (`channels`, `shell`, `tools`), the activation pathway from shell to `async` (Inngest) where stewards actually run, and the trust-boundary rules around running a broad-access shell. It does not redefine the underlying ontology or runtime chain — instead it explicitly subordinates itself to the final canonical RAWR architecture and inserts itself into existing seams.

## Concern coverage

- Conversational ingress and egress (channel plane: WhatsApp, Telegram, Discord, local control UI)
- Session continuity and shell correlation state
- Machine-facing read-side inspection (filesystem, processes, browser/app state, logs, worktree status, topology/catalog snapshots)
- Special-action tool capabilities (open URL, focus app, screenshot, scratch artifact, notification)
- Governance frontier: which mutations the shell may NOT perform directly
- Steward activation routing and act/propose/escalate decisioning
- Durable async orchestration (Inngest) as single orchestration plane
- Multi-process topology (`agent.ts` vs `async.ts` vs `server.ts` vs `web.ts`)
- Trust-boundary policy (one gateway = one trusted operator boundary; multi-profile isolation)
- Workspace and sandbox posture for shell runtime
- Manifest composition for the `agent` role with explicit surface membership
- Builder families: `defineAgentChannelPlugin`, `defineAgentShellPlugin`, `defineAgentToolPlugin`
- Runtime modes: development, durable local-first, hybrid deployed
- Reply correlation and conversational delivery semantics
- Topology/catalog read-side consumption (without owning it)
- Subsystem invariants and forbidden patterns
- Steward outcomes vocabulary (acted, proposed, escalated, refused, narrower scope, collaborator activation)
- Placement rules for broad-access shell instances

## Platform-level signal

Primarily **Coordination** (with strong Cross-cutting trust/governance overtones). The OpenShell subsystem is *the* coordination layer connecting external trusted-operator messaging into RAWR's durable execution. It is explicitly NOT Core Runtime — section 3.1 states it does not replace the runtime compiler, bootgraph, process runtime, or async role. It is also explicitly NOT Governance authority — stewards and the act/propose/escalate machinery own governance decisions. It is the human signal-intake plane that feeds both Core Runtime (via durable events) and Governance (via steward delegation). The shell is the canonical "outside-world signal receiver" for trusted operators, parallel to `server` for product callers.

## Vendor integrations declared

- **OpenShell** (the framing technology): named as the "shell/runtime substrate" beneath the `agent` role. Treated as substrate, not orchestrator. Raw OpenShell APIs are required to remain behind `packages/agent-runtime/*` adapter boundaries — the spec is explicit that vendor APIs do not leak.
- **Inngest**: bound to the `async` role for durable orchestration ("durable steward orchestration | Inngest on `async`"). Sole canonical durable execution authority.
- **Channel vendors** (WhatsApp, Telegram, Discord): named as channel plane examples; integrated via `agent/channels/*` plugins. No deep integration semantics — left to per-channel adapter plugins.
- **Railway**: mentioned for deployed product apps (`server`, `async`, `web`); the `agent` role explicitly does NOT deploy there.
- **No LLM/agent SDK named.** The shell's "brain" lives in `agent/shell/main` but no model provider, prompt orchestration, or LLM client vendor is specified. This is a notable silence — see don't-own frontier.
- **No container/sandbox vendor named.** Sandboxing is described as a posture (per-profile sandbox/tool policies, separate OS users/hosts, isolated workspaces) without binding to a specific tool (no Docker, Firecracker, gVisor, nsjail, etc.).
- **bootgraph, runtime-compiler, topology-catalog, agent-runtime, hq-sdk, shared-types**: RAWR-internal packages referenced as the ontological substrate this spec defers to.

## Don't-own-still-manage frontier

This is the spec's central organizing principle. Explicit don't-own positions:

- **Compute isolation / sandboxing**: spec acknowledges per-profile sandbox/workspace separation is required when trust boundaries demand it (16.5, 17.4) but binds to no specific isolation tool. Manages it as POLICY, not implementation.
- **LLM/model API**: completely silent. The "shell brain" is referenced (10.3, 13) but model providers, token budgets, prompt strategy, and tool-calling protocol are not specified. Strongest don't-own implicit silence.
- **Channel transport**: WhatsApp/Telegram/Discord protocol details, auth tokens, webhook plumbing — pushed entirely into per-channel adapter plugins.
- **Durable orchestration**: explicitly delegated to Inngest. The spec manages the integration point ("emit durable work into the same orchestration plane") rather than building queueing.
- **Repo mutation**: explicitly NOT shell-owned. Pushed to stewards on `async`. The shell manages the *delegation contract* (request id, conversation reference, target domain scope) but not the mutation itself.
- **Process lifecycle**: explicitly bootgraph's job; shell adapts but does not own.
- **Topology export / control plane**: shell may consume read-side, but ownership stays with the hidden process runtime / topology-catalog seam (22.2).
- **Network exposure**: the gateway uses "loopback-first or otherwise private exposure" but defers VPN/tunnel mechanics to the operator.

The phrase "broad read, narrow write, no direct governed repo mutation" (15.3) is the canonical don't-own contract for the shell itself.

## Runtime-semantic claims subordinate to the Effect Runtime Realization spec

The spec is unusually disciplined about subordinating itself. Several places where it makes runtime-semantic statements that MUST defer to the authoritative runtime spec:

- Section 1: "It does not redefine: the top-level ontology of `packages / services / plugins / apps`; the semantic chain `app -> manifest -> role -> surface`; the runtime chain `entrypoint -> runtime compiler -> bootgraph -> process runtime -> harness -> process -> machine`." — explicit subordination.
- Section 4: "This subsystem fits into those seams directly... This subsystem adds no new top-level architecture kind."
- Section 6: "services own capability truth; plugins own runtime projection; apps own composition authority; entrypoints choose process shape; bootgraph owns lifecycle only" — restates the runtime spec's law verbatim and binds itself to it.
- Section 20.3: bootgraph remains process-local; this subsystem does not extend or modify bootgraph semantics.
- Section 23.7 (Canonical architecture alignment invariants): four explicit "does not redefine" invariants.

**Flag**: the spec restates runtime law correctly, but if the authoritative Effect Runtime Realization spec changes any of those primitives (esp. role/surface naming, runtime chain composition, bootgraph contract, manifest composition law), this spec must follow. Two specific load-bearing claims worth watching:
1. The claim that `agent` is one of the canonical roles alongside `server / async / web / cli` — must match runtime spec's role enumeration.
2. The claim that `agent` may emit durable events directly into the async orchestration plane without proxying through `server` (8.3, 14.4) — this implies a durable-event-emission capability that must be canonically blessed by the runtime spec. If the runtime spec restricts who can emit, this becomes a contract violation rather than a free choice.

## Completeness signals

- **Filename has `_Final` suffix**, and the content largely supports that framing — the spec is structurally complete: scope, problem, thesis, position, bindings, planes, authorities, surfaces, package layout, manifest, builders, activation, capability policy, gateway, correlation, governance, process model, modes, invariants, forbidden patterns, final picture. All sections present.
- **No explicit TBD/TODO markers found.**
- **No "open questions" section.**
- **Authoritative tone throughout** ("The canonical rule is...", "These invariants are load-bearing", "The following patterns are forbidden").
- **Honest exploratory edges** despite the _Final tag:
  - Section 22.3 explicitly defers a "more serious operator or control plane" to a later evolution.
  - Section 17.2 says "A default implementation may use..." — indicates the gateway implementation is not specified, only constrained.
  - Section 21 describes runtime modes as posture rather than concrete deployment recipes.
  - The shell brain (10.3, 13) is described semantically but no LLM integration, model selection, prompt envelope, or tool-protocol is specified.
  - Channel adapters (WhatsApp/Telegram) named but unspecified at protocol/plugin-shape level.
- **References other RAWR specs without naming them**: "the final RAWR canonical architecture", "the canonical RAWR shell", "tensions, RFDs, governance" — implies dependencies on the Effect Runtime Realization spec, governance/workstream specs, and possibly the Async Runtime spec, but no explicit cross-spec citations.

The spec feels finished as a *boundary-and-policy* document. It feels exploratory as a *concrete-implementation* document — the shell brain and channel adapters are essentially TODOs implicit in the structure.

## Cross-spec dependencies

- Implicitly depends on **RAWR Effect Runtime Realization Canonical Spec** for the runtime chain, role/surface ontology, manifest composition, and bootgraph contract. This is the single most important upstream dependency.
- Implicitly depends on **RAWR Async Runtime Canonical Spec** for the durable orchestration plane semantics (Inngest binding, workflow/consumer/schedule surfaces).
- References without naming: a **Stewardship/Workstream/Governance spec** (act/propose/escalate, blast radius, RFDs, tensions, steward review).
- References without naming: a **Topology/Catalog spec** (read-side consumption only).
- Likely sibling/peer to **Managed Agent Workspace Execution spec** (worktree-scoped steward execution lives there).
- Likely sibling to **Authentication Subsystem spec** (gateway authentication, sender allowlists, trusted-operator boundary enforcement).
- Likely sibling to **Deployment Subsystem spec** (Railway placement of `server/async/web`, agent placement rules).
- Does not reference any spec by filename or version.

## Verbatim load-bearing definitions / claims

1. (§1 canonical result) "OpenShell is the shell/runtime substrate for the human-facing `agent` role. The shell owns intake, continuity, roaming inspection, and lightweight direct action. The `async` role remains the durable steward execution plane. Governed domain work routes through steward activation on `async`. The shell does not become a second orchestrator or a general control plane."

2. (§2 split) "human-facing shell authority != durable steward execution authority"

3. (§3.1) "OpenShell is the default runtime substrate and policy envelope beneath the shell-facing part of the `agent` role."

4. (§3.7 operating principle) "the shell drives what / the stewards drive how / governance decides whether"

5. (§8.3 canonical rule) "external conversational ingress enters through agent / external product ingress enters through server / durable system work runs on async"

6. (§14.4) "The shell does not need a fake synchronous server route just to create work."

7. (§15.3 default shell posture) "broad read / narrow write / no direct governed repo mutation / selected special actions only by policy"

8. (§16.4 trust-boundary rule) "one trusted operator boundary per shell gateway"

9. (§17.3 safety posture) "default private or loopback-oriented binding; authentication required; remote access only through explicitly trusted channels or secure tunnels/VPN; no public anonymous exposure for a broad-read shell"

10. (§18) "The shell owns conversational delivery. Stewards own work results. The async plane does not become a chat gateway."

11. (§20.7 agent placement) "The `agent` role is normally local or on a dedicated trusted host. It is not a public internet surface."

12. (§21.4 canonical constraint) "The durable execution model does not change across those modes. What changes is placement. What does not change is meaning."

13. (§23.1 OpenShell invariants) "OpenShell is the shell/runtime substrate, not the orchestration plane. Raw OpenShell APIs stay behind RAWR adapter boundaries. Channel and shell policy remain RAWR-owned at the architectural boundary."

14. (§23.4 orchestration invariants) "there is one durable orchestration layer; shell, server, schedules, and observations all feed the same durable event plane; shell requests do not introduce a second queue or a synchronous proxy chain just to create work"

15. (§24 forbidden patterns excerpts) "treating OpenShell as the RAWR control plane; letting the shell directly implement governed code changes in governed scopes; collapsing `agent` and `async` into one authority layer; making the file tree encode deployment shape instead of role and surface meaning"

16. (§25 final canonical picture) "the shell is the human-facing client runtime / OpenShell is the shell/runtime substrate / the agent role owns channels, shell, and shell-facing tools / the async role owns stewards, observation, and durable activation / there is one durable orchestration plane / the shell may inspect broadly but does not own governed mutation / stewards own correctness and implementation inside governed domains"

## Estimated completeness grade (initial impression)

**B+**. The spec is structurally complete, internally consistent, well-aligned with the canonical architecture, and disciplined about subordination — the boundary, authority, and trust-policy story is essentially finished. However, it leaves the *implementation-shape* of the shell brain, the LLM/agent-SDK binding, and channel adapters as unsourced silences, and "_Final" overstates how settled the integrations actually are. Strong as a constitution, lighter as a build spec.

## Relationship to Effect Runtime Realization spec — explicit flag

This spec is an **embedding/extension**, not an alternative or a higher layer:
- Embedding: it places the OpenShell substrate inside the existing `agent` role, using the existing manifest/role/surface/runtime chain. It does not introduce a new architectural kind.
- Extension: it enriches the `agent` role with three explicit surfaces (`channels`, `shell`, `tools`) and adds two new builder families (`defineAgentChannelPlugin`, `defineAgentShellPlugin`, `defineAgentToolPlugin`) — these are net-new authoring affordances that the runtime spec must accept.
- NOT an alternative: the spec explicitly forbids becoming a second orchestrator, second business execution plane, or control plane.
- NOT a higher layer: it sits at the same architectural altitude as `server`/`async`/`web`/`cli`; it does not compose them.
- The explicit subordination contract is in §1 ("does not redefine"), §6 (preserves service/plugin/app/role/surface law), and §23.7 (alignment invariants).

The Effect Runtime Realization spec remains authoritative. This spec is shape-correct on top of it.
