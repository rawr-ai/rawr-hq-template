---
title: RAWR Async Runtime — spec analysis
id: rawr-async-runtime-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:34:46.547791Z'
updated: '2026-05-01T21:10:17.400717Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Async_Runtime_Canonical_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Async_Runtime_Canonical_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines RAWR HQ's durable async runtime and steward activation system. It fixes five things: (1) what owns durable activation/orchestration, (2) how HQ runs that activation locally on the machine where the repo and agents live, (3) how the same system operates across local-dev / hosted-cloud / self-hosted modes without changing architecture, (4) how private operator access, public product serving, and steward activation stay separated, and (5) how these choices fit the existing RAWR ontology (`app -> manifest -> role -> surface`, `entrypoint -> bootgraph -> process`). It is explicitly framed as a load-bearing target subsystem spec, specializing the `async` role of the broader system, not redefining the runtime.

## Concern coverage

- Durable orchestration / async runtime (primary)
- Event-driven signal ingestion, retries, scheduling, idempotency-by-step
- Steward activation as a workflow class on the async surface
- Worker transport vs control plane separation
- Local-first authority vs deployable projection
- Mode parity: local dev, hosted cloud, self-hosted
- Private operator access (Tailscale) vs public product serving (Railway)
- Observation, tension propagation, collision, governance pauses, human-in-the-loop pause/resume
- Plugin contribution shapes for async (workflows / consumers / schedules / internal)
- Process placement (one Railway service per long-running role)
- Manifest composition for async role
- Operational separation between caller-facing `server`, UI `web`, durable `async`, and steward execution
- Touches but defers: agent execution surface (AgentKit inside Inngest functions)

## Platform-level signal

Primarily **Coordination** (signal ingestion + durable routing + activation across the local↔deployed seam), with strong overlap into **Core Runtime** because it specializes the `async` role of the runtime ontology and dictates worker realization (`connect` worker, bootgraph integration). It is the canonical bridge between the platform's local-first authority core and outside-world signals (webhooks, public requests, observation, governance events). Justification: the spec's whole job is to define how durable signals reach steward execution while keeping the runtime's internal seams intact — that is coordination work expressed in runtime terms.

## Vendor integrations declared

- **Inngest (primary)** — durable activation runtime. Owns event ingestion, scheduling, retries, step durability, concurrency controls, worker coordination, run history/tracing, pause/resume. HQ uses `connect` (outbound WebSocket worker transport) rather than `serve` (HTTP). Three control-plane destinations: Inngest Dev Server (local), Inngest Cloud (hosted), self-hosted Inngest via `inngest start` (SQLite persistence + separate Connect gateway). Stand-on-shoulders pattern: Inngest owns durability semantics; RAWR owns no second queue.
- **AgentKit** — steward execution model running *inside* Inngest functions on the async role. Not a separate dispatch substrate.
- **Tailscale** — private operator reachability to local HQ (UI, private server surfaces, admin, debugging). Explicitly *not* the durable worker transport. Tailscale Serve is tailnet-private; Funnel (public) is named only to disqualify it.
- **Railway** — operational placement target for deployed services. "One Railway service per long-running role." Internal DNS + replicas. Not the owner of semantic topology.
- **Bootgraph** (RAWR-internal) — process-local lifecycle owner; explicitly *not* the workflow engine, event router, or control plane.

## Don't-own-still-manage frontier

The spec is unusually explicit about this. RAWR does NOT own:
- durable orchestration semantics → Inngest
- worker transport durability → Inngest `connect`
- public placement / replicas → Railway
- private peer reachability → Tailscale

But RAWR DOES still manage:
- which control plane the worker dials (mode selection)
- credentials, inspection-surface routing per mode
- the manifest contract for registering Inngest functions
- the boundary that signals must cross (event-emit vs synchronous call) when public surfaces need privileged local steward work
- the role-shaped split (`server` emits events; `async` consumes; `web` stays UI-only)
- governance pauses expressed as Inngest pause/resume

**Silences / implicit lean**: the spec hand-waves on (a) the Inngest **event-key / signing-key** rotation and secret distribution model, (b) **idempotency-key** authoring conventions for steward activation events, (c) **schema evolution** of event payloads across mode boundaries, (d) **dead-letter / poison-event** handling beyond Inngest defaults, (e) **auth on emit** — who is allowed to emit which event, especially from public `server` into the privileged HQ worker. These are clearly leaned-on-Inngest but the integration-point ownership is unstated.

## Reconciliation flags vs Effect Runtime Realization spec

This spec is **scoped narrower** than the Effect Runtime Realization spec and explicitly declares it does not redefine app, manifest, role, surface, entrypoint, bootgraph, process, machine, or Railway service. Treat it as a **specialization of the `async` role** within the authoritative runtime model rather than a competing one. Points to reconcile:

- "bootgraph owns process-local lifecycle, not orchestration semantics" — should match Effect Runtime Realization's bootgraph contract verbatim. Confirm wording parity.
- "open connect worker" inside the async entrypoint — needs to be expressible as a bootgraph node / EffectRuntimeAccess consumer in Effect-runtime terms (Layer/Scope). The spec says nothing Effect-specific; downstream agents must check the Effect spec defines an Inngest adapter Layer.
- Steward activation = AgentKit network inside Inngest function — the Effect spec is authoritative on how that AgentKit call sits inside an Effect program; this spec is silent on the Effect bridge.
- Event emission from `server` role — must square with the Effect spec's oRPC server boundary; this spec doesn't state whether `server` emits via an Effect-wrapped Inngest client.
- Pause/resume semantics — durable async pauses must compose with Effect's structured concurrency / Scope teardown.
- Mode selection (Dev / Cloud / Self-hosted) — needs to land as a config Layer in Effect terms.

Not superseded; the spec is **older or peer-shape, more recent on Inngest specifics**. It pre-commits the vendor choice and the role placement; the Effect Runtime Realization spec is authoritative on *how* that choice is realized as Effect programs and runtime contracts.

## Completeness signals

Strengths:
- Crisp canonical decision early ("HQ's durable async runtime is always Inngest-backed, and HQ's async worker is always `connect`-based")
- Clear mode invariant table (same app / manifest / role / functions / shape; only control plane / creds / inspection differ)
- Explicit non-goals (Tailscale not transport; bootgraph not workflow engine; `serve` not HQ's transport)
- Named flow diagrams for four signal/request paths
- Plugin contribution split is committed (`workflows/`, `consumers/`, `schedules/`, optional `internal/`)
- Final "subsystem in one picture" diagram acts as a normative summary

Gaps / exploratory feel:
- No TBD/TODO/Phase markers, but several integration silences (see "Don't-own-still-manage frontier" silences above)
- No explicit Effect / EffectRuntimeAccess bridge — this is the biggest reconciliation owed to the Effect Runtime Realization spec
- No event schema, no event-name registry, no signing/auth model for events
- No retry/backoff policy guidance beyond "Inngest does retries"
- No observability/telemetry binding (HyperDX or otherwise) for Inngest run traces — surprising omission given Inngest already has tracing
- No testing strategy for the worker (Dev Server is named but contract-level test patterns are not)
- No story for **multi-tenant** or **per-app** Inngest app IDs
- No idempotency-key conventions
- No story for graceful drain on deploy / worker restart beyond "bootgraph teardown"

Cross-spec dependencies:
- Specializes RAWR System Architecture (`app -> manifest -> role -> surface`) and the Effect Runtime Realization spec (`entrypoint -> bootgraph -> process`).
- Implicitly references AgentKit / steward specs (OpenShell Agent Runtime + Steward Activation, Managed Agent Workspace Execution).
- References Deployment subsystem (Railway placement, "one service per long-running role").
- References (without naming) the Authentication subsystem for "private operator access" via Tailscale.

## Verbatim load-bearing definitions / claims

1. (Scope) "This document defines the canonical runtime model for RAWR HQ's durable async surface and the steward activation system that runs on top of it."
2. (Goals) "The architecture must not introduce a second queue in front of the workflow runtime. Durable orchestration belongs to one system."
3. (Goals) "The same HQ async worker must operate across local development, cloud-hosted, and self-hosted modes by changing configuration and control-plane destination, not by changing architectural shape."
4. (Canonical decision) "HQ's durable async runtime is always Inngest-backed, and HQ's async worker is always `connect`-based."
5. (Canonical decision) "Only the control-plane destination, credentials, and inspection surface change."
6. (Practice) "`connect` is not a second queue. It is the worker transport for the same durable runtime."
7. (Practice) "HQ's async role runs as a long-lived worker process that dials out and connects to the Inngest control plane. It does not need to expose a public HTTP endpoint in order to receive durable work."
8. (Steward activation) "The async surface owns durable execution. Steward activation is one class of durable execution on that surface."
9. (Tailscale) "Tailscale remains important, but for a different reason. Its canonical place in this system is private operator access to the local HQ environment ... It is not the canonical transport for durable async execution."
10. (Railway) "one Railway service per long-running role"
11. (Bootgraph boundary) "The bootgraph continues to own only process-local lifecycle ... It does not become the workflow engine. It does not become the event router. It does not become the control plane."
12. (Connect transport) "It uses an outbound persistent WebSocket connection and is intended for long-running runtimes rather than serverless request handlers."
13. (Self-hosted) "`inngest start` provides a self-hosted server with persistence via SQLite by default and exposes a separate Connect gateway."
14. (Mode invariant) "same app / same manifest / same async role / same function definitions / same worker shape / same activation model / different control-plane destination / different credentials / different inspection surface"
15. (Conclusion) "The activation system uses Inngest events as its durable signal plane and runs steward activation, observation, tensions, governance pauses, and feedback loops on the async surface."

## Estimated completeness grade (initial impression)

**B+**. Strong on the canonical decision, mode invariant, and seam separation (Tailscale vs Railway vs Inngest vs bootgraph). Authoritative-feeling within its declared scope. Loses a notch because it owes integration-point detail on event auth/schemas/idempotency/observability and an explicit Effect-runtime bridge to the authoritative runtime spec — those are exactly the "don't own but still manage" surfaces that the user's framing calls out as the place this kind of spec must not go silent.
