---
title: 'Depth investigation: Inngest integration mode at architecture level'
id: depth-investigation-inngest-integration-mode-at-architecture-level
tags:
- runtime-canon-arch-align
- locus-inngest-integration-mode-architecture-level
created: '2026-05-02T21:20:25.630960Z'
status: draft
type: interim
deprecated: false
summary: 'Runtime-spec §21.2 names ''async harness mode'' as a distinct input and
  lists both serve-mode and connect-worker mode as outputs — neither is the default.
  The arch-spec §13.2 must add one paragraph naming both modes (mode = process-start
  harness-selection fact, not a profile-provider concern) plus a diagram annotation
  and one §17.8 invariant. Amendment scope: trivial paragraph add plus annotation.'
---

# Interim report: inngest-integration-mode-architecture-level

**Locus question:** Should the canonical architecture spec specify Inngest's serve-mode vs connect-worker mode at the architecture level (because they imply different network ingress topologies for the async role), and what is the integration-level paragraph + invariant the arch-spec needs to add?
**Flavor:** technical

---

## 1. Locus framing

The canonical architecture specification names Inngest as the default async harness and shows the async process stack terminating at `FunctionBundle -> Inngest harness` (arch-spec §13.2, L2178-L2192). It says nothing about whether that harness binding is serve-mode (HTTP inbound listener) or connect-worker mode (outbound WebSocket). This is architecturally consequential because:

- **Serve-mode** requires the async process to expose an HTTP port for Inngest cloud to call. The process is an HTTP server that registers `/api/inngest` (or similar) and receives execution requests from outside. This changes the ingress model of the async role from "outbound-only" to "HTTP listener."
- **Connect-worker mode** requires the async process to initiate and hold an outbound WebSocket to Inngest's gateway. No inbound HTTP port is needed. The async role's network surface changes to "outbound connection only."

The arch-spec's silence on this choice means the architecture-level network topology of the async role is undefined. Deployment engineers, companion spec authors, and operators cannot reason about the async process's network posture — whether they need to open an inbound port, configure a reverse proxy, or just allow outbound WebSocket connections — without consulting the runtime-spec or the vendor docs directly. This is not a gap that can be resolved by "deferring to runtime-spec authority"; the arch-spec must add one clarifying paragraph and one invariant to make the network topology of the async role readable at the architecture level.

---

## 2. Vendor verification summary

**Source:** [[vendor-verification-inngest-integration-mode-2]]
**Technology:** Inngest SDK
**Version verified:** 4.2.6 (as of 2026-05-02, the day of this investigation)
**Verified from:** https://registry.npmjs.org/inngest/4.2.6 (exports), https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/bun.ts, https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/components/connect/index.ts

The vendor verification note confirms two distinct, non-interchangeable integration modes exist in Inngest 4.x:

**Serve-mode (HTTP handler, inbound):**
> "Pattern: A Bun (or Express/Hono/etc.) HTTP server registers an endpoint (e.g., `/api/inngest`) that serves Inngest function definitions AND handles execution requests. Inngest's cloud infrastructure polls this endpoint (or the app registers its URL with Inngest). Requires inbound HTTP access from Inngest cloud to the running process. Code shape: `serve({ client: inngest, functions })(request)` mounted on an HTTP route."
> — [[vendor-verification-inngest-integration-mode-2]], confirmed via `inngest/bun` adapter

**Connect-worker mode (outbound WebSocket, no inbound HTTP required):**
> "Pattern: Process initiates an outbound WebSocket connection to Inngest's gateway infrastructure. `WebSocketWorkerConnection` class is the implementation. Does NOT require inbound HTTP access — the process connects OUT. Supports `isolateExecution` (worker thread isolation per execution), `maxWorkerConcurrency`, and `gatewayUrl` configuration. Code shape: `connect({ apps: [{ client: inngest, functions }] })`."
> — [[vendor-verification-inngest-integration-mode-2]], confirmed via `inngest/connect` export

The note explicitly names the architecture-level consequence:
> "The arch-spec's silent choice of Inngest integration mode is a real gap... whether the async role exposes an HTTP endpoint or makes an outbound connection — a meaningful system-architecture distinction."

**Drift check:** The vendor verification note was written on the same date as this investigation (2026-05-02) for version 4.2.6, which is current. No drift is expected. One additional data point: the lab evidence in `/tools/runtime-realization-type-env/evidence/vendors/inngest.md` shows the current lab is running `inngest 3.51.0` (not 4.x) and uses `inngest/bun` (serve-mode) exclusively in Phase Two/Three proof work. This means the lab has only validated serve-mode — connect-worker mode is unproven in the lab to date.

---

## 3. Runtime-spec evidence

**§21.2 Inngest harness (L4302-L4310) — the primary evidence:**

```
### 21.2 Inngest harness

Placement: `packages/core/runtime/harnesses/inngest`.

Input: `FunctionBundle`, selected Inngest runtime resource, async harness mode, process access, runtime telemetry.

Output: connected worker or serve-mode runtime ingress, native Inngest functions, native async handles used by runtime dispatcher integration, `StartedHarness`. The harness does not produce or own `WorkflowDispatcher`.

Boundary rule: Inngest owns durable async execution semantics. It does not own workflow meaning, service domain authority, caller-facing API semantics, app membership, provider selection, or runtime provisioning.
```

The phrase "**async harness mode**" in the Input line (L4306) is the load-bearing finding. The runtime spec names "async harness mode" as a distinct input to the Inngest harness — separate from `FunctionBundle`, the selected Inngest runtime resource, process access, and runtime telemetry. This means:

1. Mode is a **named input at the harness boundary** — not an internal harness implementation detail, not inferred from the profile, not implicit.
2. The runtime spec uses "connected worker or serve-mode" in the Output line — explicitly naming both modes as valid harness outputs. Neither is a default; both are explicitly listed.
3. The runtime spec does **not** mandate a default mode or mark one mode as profile-specific. The phrase is neutral: "connected worker **or** serve-mode runtime ingress."

**§10.3 Entrypoint (L1549) — corroborating evidence:**
> "`startApp(...)` is the canonical app start operation. It receives selected app definition, runtime profile, process roles, and **optional process/harness selection facts**."

The phrase "optional process/harness selection facts" is the mechanism. Harness mode is a harness-selection fact passed through `startApp`, not a RuntimeProfile concern. This means mode selection happens at the entrypoint/process-start level, not at the resource/provider selection level.

**§1 Execution ownership law (L50-L65):**
> "Inngest owns durable async."

This confirms Inngest's role as the architectural owner of durable async semantics — but says nothing about which integration mode it operates in.

**Conclusion on the runtime-spec's position:** The runtime spec does **not** mandate a default mode. It explicitly supports both modes as first-class options. Mode is named as a harness-selection fact passed to `startApp(...)`. Mode is not selected via the RuntimeProfile's provider selection. The runtime spec treats both modes as live options, and the mechanism for selecting between them is the "optional process/harness selection facts" in `startApp`.

---

## 4. Architecture-level implications

### Serve-mode implications

- The async role process **exposes an HTTP port**. This is not the same port as the server role's Elysia HTTP server (unless co-hosted), but it is an inbound listener.
- Deployment/networking: the process must be reachable from Inngest cloud (or a self-hosted Inngest server). This means firewall rules, reverse proxy config, and URL registration with Inngest are deployment concerns.
- **Cohosted dev mode**: When `roles: ["server", "async", ...]` run in a single process (dev.ts), and if serve-mode is the chosen async harness mode, the Inngest serve handler likely mounts as a route on the existing Elysia server (e.g., `/api/inngest` route). The single cohosted process already exposes one HTTP port for the server role — serve-mode adds an Inngest route to that same HTTP server. This is compatible with cohosting, and is exactly what the lab's Phase Two/Three work demonstrates.
- **Split production**: The async process runs separately and exposes its own HTTP listener for Inngest. This is the separate-process version of the same topology.

### Connect-worker mode implications

- The async role process **does not expose an inbound HTTP port** for Inngest. Its only network requirement is outbound WebSocket access to the Inngest gateway.
- Deployment/networking: simpler inbound firewall rules (no inbound ports needed for Inngest), but the process must maintain a persistent outbound WebSocket connection to Inngest's gateway.
- **Cohosted dev mode**: when multiple roles cohost in one process and connect-worker mode is used, the async role's Inngest connection is outbound. There is no port conflict with the server role's HTTP listener — they are independent network concerns. Cohosting is compatible with connect-worker mode, but the async Inngest surface does NOT add a route to the Elysia server.
- **Production**: The async process makes an outbound connection. Inngest executes function callbacks by calling back over the WebSocket. The process does not need to be publicly reachable.

### Mode-choice constraint on cohosted processes

**Can a cohosted dev process running multiple roles bind a serve-mode async harness on a port that also serves the server harness?**

Yes — but with an important condition: in serve-mode, the Inngest route (`/api/inngest` or configurable) must be registered on the HTTP server. If the cohosted process has a server role running Elysia on port 3000, the Inngest serve handler becomes a route at (e.g.) `http://localhost:3000/api/inngest`. This is exactly the pattern the lab uses (Phase Two, inngest 3.51.0, `inngest/bun`, `serve(...)` mounted as a route). Serve-mode and the Elysia server harness naturally co-locate on the same port in the cohosted case.

In connect-worker mode, there is no route registration — the async harness initiates a WebSocket. No port conflict is possible. The two harnesses are fully independent at the network layer.

**Mode constraint on companion specs:** Companion harness specs or vendor integration authors writing against the async role need to know which mode to target. Without an architecture-level statement of the mode selection mechanism, companion spec authors must read runtime-spec §21.2 to learn that "async harness mode" is a named input — and they have no architecture-level invariant telling them "a single process binds exactly one mode."

---

## 5. Draft prose for arch-spec §13.2 (Async harness posture)

### BEFORE (current arch-spec L2194-L2211)

```markdown
### 13.2 Async harness posture

The async process stack is:

```text
services/*
  -> plugins/async/workflows/*, schedules/*, consumers/*
  -> AppDefinition
  -> startApp(...)
  -> @rawr/sdk derivation
  -> runtime compiler
  -> bootgraph and provisioning kernel
  -> process runtime and async surface adapter
  -> FunctionBundle
  -> Inngest harness
```

Inngest owns durable async execution semantics. It does not own workflow meaning, service truth, caller-facing API semantics, app membership, provider selection, or runtime provisioning.
```

### AFTER (proposed addition — integration paragraph only, no runtime mechanics)

```markdown
### 13.2 Async harness posture

The async process stack is:

```text
services/*
  -> plugins/async/workflows/*, schedules/*, consumers/*
  -> AppDefinition
  -> startApp(...)
  -> @rawr/sdk derivation
  -> runtime compiler
  -> bootgraph and provisioning kernel
  -> process runtime and async surface adapter
  -> FunctionBundle
  -> Inngest harness [serve-mode | connect-worker mode]
```

Inngest owns durable async execution semantics. It does not own workflow meaning, service truth, caller-facing API semantics, app membership, provider selection, or runtime provisioning.

The Inngest harness operates in one of two modes selected at process-start time: **serve-mode**, in which the harness binds an HTTP route handler (inbound; Inngest cloud calls in), or **connect-worker mode**, in which the harness initiates an outbound persistent connection to Inngest's gateway (no inbound HTTP required). Mode selection is a harness-selection fact supplied to `startApp(...)` and is not determined by the RuntimeProfile's provider selection. In a cohosted development process, serve-mode registers the Inngest handler on the shared HTTP server alongside server role routes; connect-worker mode runs independently of the server role's HTTP listener. The harness contract and mode lifecycle are defined in the runtime realization specification, §21.2.
```

---

## 6. Draft invariant for arch-spec §17.8 (Runtime subsystem invariants)

**Proposed addition to §17.8:**

> `an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.`

**Alternative placement — §17.4 (App and entrypoint invariants), if preferred:**

> `Inngest harness mode is a process-start harness-selection fact; it is not a profile-provider concern and is not re-selectable within a running process.`

The §17.8 placement is preferred because §17.8 already lists runtime subsystem invariants including "harnesses consume mounted surface records or adapter-lowered payloads" — the mode invariant is the same category.

---

## 7. Stack-diagram amendment

The current stack diagram (arch-spec L2198-L2209) shows `FunctionBundle -> Inngest harness` as the terminal without mode annotation. Three options:

**Option A: Mode annotation on the same line (recommended)**
Add `[serve-mode | connect-worker mode]` to the Inngest harness line:
```text
  -> Inngest harness [serve-mode | connect-worker mode]
```
This keeps the diagram compact and readable. The prose paragraph below the diagram carries the semantic explanation. This is the lowest-complexity change.

**Option B: Two variant diagrams**
Show two diagrams — one for serve-mode (labeling the bottom as "-> HTTP listener ingress") and one for connect-worker mode (labeling the bottom as "-> outbound WebSocket ingress"). More informative but adds length and may over-specify the stack diagram for what is a profile-selection concern.

**Option C: No diagram change; prose carries the mode information**
Leave the diagram as `FunctionBundle -> Inngest harness` and rely entirely on the added prose paragraph. Simpler, but the diagram then understates the ingress topology difference, which is the architecturally consequential point.

**Recommendation:** Option A. The `[serve-mode | connect-worker mode]` annotation makes the bifurcation visible at a glance without requiring two diagrams. The prose paragraph provides the semantic content.

---

## 8. Cross-locus implications

**companion-spec-attachment-points-registry locus:** The Inngest harness will be one of the named attachment points in the registry (harness name: Inngest; input type: FunctionBundle; output type: started harness with connected worker or serve-mode ingress; owning runtime-spec section: §21.2). The mode annotation in §13.2 directly feeds this registry — companion harness spec authors need the architecture-level mode statement to know what the Inngest attachment point's ingress contract is. Without the mode statement in §13.2, the registry entry for the Inngest harness would be incomplete.

**harness-mount-interface-contract-named-types locus:** The `FunctionBundle` type is the input contract for the Inngest harness. The mode annotation in §13.2 adds the information that the harness's output is mode-dependent (`connected worker ingress` vs `serve-mode HTTP route`). The `StartedHarness` return type is invariant across modes. The type-naming locus should note that `FunctionBundle` → `StartedHarness` is the Inngest harness's typed contract, with the mode selecting which network ingress the `StartedHarness` represents.

---

## Evidence synthesis

The runtime spec at §21.2 (L4302-L4310) is explicit: it names "async harness mode" as a distinct harness input and lists "connected worker or serve-mode runtime ingress" as the harness output. Neither mode is designated as a default. The mechanism for mode selection — "optional process/harness selection facts" in `startApp(...)` at runtime-spec L1549 — makes mode a process-start selection fact, not a provider/profile concern.

The vendor verification note [[vendor-verification-inngest-integration-mode-2]] confirms both modes are live in Inngest 4.2.6 via separate SDK entry points (`inngest/bun` for serve, `inngest/connect` for connect-worker). The lab currently uses only `inngest 3.51.0` with serve-mode — connect-worker mode is architecturally specified in the runtime-spec but not yet lab-proven.

The arch-spec's current §13.2 is silent on mode. The architecture-level gap is real and not resolvable by user heuristic ("runtime spec wins on runtime concerns") because the gap is in the arch-spec, not a dispute between the two specs. The arch-spec must add content.

The scope of the amendment is narrow: one paragraph added below the existing boundary-rule sentence in §13.2, one diagram annotation, and one invariant bullet in §17.8. No runtime-internal mechanics need to be duplicated. The prose delegates the mode contract and lifecycle to runtime-spec §21.2 by reference.

---

## Committed position

The arch-spec must add a mode-statement paragraph to §13.2 and a mode-binding invariant to §17.8, because the runtime spec's "async harness mode" input to the Inngest harness (§21.2, L4306) is architecturally consequential and the arch-spec is the document that owns the async role's network topology description. The mode statement must say: both modes exist, mode is a harness-selection fact in `startApp(...)` (not a profile-provider concern), serve-mode implies an HTTP listener, connect-worker mode implies an outbound WebSocket, and the two are mutually exclusive within a single process. The amendment is scoped to one paragraph + diagram annotation + one invariant — it does not require a structural revision of §13.2.

- **Position:** The arch-spec §13.2 must add one integration paragraph naming both Inngest harness modes, stating that mode is a process-start harness-selection fact (not a profile concern), and deferring the mode contract to runtime-spec §21.2; arch-spec §17.8 must add one invariant that a single async role process binds exactly one mode.
- **Confidence:** high — runtime-spec §21.2 is unambiguous ("async harness mode" as named input, "connected worker or serve-mode" as named output), vendor verification confirms both modes in Inngest 4.2.6, and the mechanism (process-start harness-selection fact) is stated at runtime-spec L1549. The only ambiguity is whether mode selection defaults to serve-mode implicitly (which the lab evidence suggests, since the lab uses serve-mode exclusively) — but this ambiguity does not change the arch-spec amendment requirement, only whether the arch-spec should call out a default.
- **Boundary conditions:** This position holds for L3 Inngest integration (serve-mode and connect-worker via `inngest/bun` and `inngest/connect`). If Inngest deprecates one mode in a future major version, the arch-spec paragraph would need revision. Also applies only to the `async` role — other roles (server, cli, etc.) have no mode ambiguity.
- **What would change this position:** If runtime-spec §21.2 were updated to mark one mode as "default" or to remove one mode, the arch-spec paragraph's neutral framing would need adjustment (it could then say "serve-mode by default; connect-worker mode for production environments where inbound HTTP access is unavailable"). Currently, the runtime-spec's neutrality means the arch-spec must also be neutral on the default. Additionally, if the lab were to prove connect-worker mode operationally (currently unproven in Phase Two/Three), that would strengthen confidence that both modes are fully supported.
- **Evidence weight:** 1 runtime-spec §21.2 harness contract (explicit, unambiguous), 1 vendor-verification note (Inngest 4.2.6 confirmed), 1 lab evidence file (serve-mode only in lab, 3.51.0, relevant but not decisive for architecture-level), runtime-spec L1549 (startApp harness-selection facts mechanism). All four converge. No contradicting evidence.
- **Amendment classification:** "trivial paragraph add plus stack diagram annotation" — the §13.2 prose paragraph is ~5 sentences; the diagram annotation is one bracketed addition on the `Inngest harness` line; the §17.8 invariant is one bullet. No structural revision of §13.2 is needed.

**Final proposed text for §13.2 addition (paragraph only, not the diagram):**

> The Inngest harness operates in one of two modes selected at process-start time: **serve-mode**, in which the harness binds an HTTP route handler (the async process exposes an HTTP port; Inngest cloud or a self-hosted Inngest server calls in), or **connect-worker mode**, in which the harness initiates an outbound persistent connection to Inngest's gateway (no inbound HTTP port is required). Mode selection is a harness-selection fact supplied to `startApp(...)` — it is not determined by the RuntimeProfile's provider selection. In a cohosted development process (all roles in one entrypoint), serve-mode registers the Inngest handler on the shared HTTP server alongside server role routes; connect-worker mode operates independently of the server role's HTTP listener with no port conflict. The mode contract and lifecycle are defined in the runtime realization specification, §21.2.

**Final proposed invariant for §17.8:**

> `an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.`

---

## Open questions

- The runtime-spec does not reveal what the `startApp(...)` API surface looks like for passing "async harness mode" — specifically, is it a top-level option or nested under a harness-specific config key? The entrypoint examples (L1560-L1580) do not show harness-selection facts. This gap matters for companion-spec authors who need to know the actual API surface.
- The lab is on `inngest 3.51.0` (not 4.x). Connect-worker mode (`inngest/connect`) is a 4.x feature. Does the runtime-spec's inclusion of connect-worker mode imply a planned version upgrade? If the platform is actually running Inngest 3.x, the connect-worker mode is not yet available. The arch-spec amendment should be forward-looking (both modes per runtime-spec) but a note in the open questions for the final report is warranted.
- Neither spec defines a default mode. Should the arch-spec declare serve-mode as the default (since the lab and all production examples use serve-mode)? This is a user decision — the arch-spec amendment should be neutral pending user guidance.

---

## Sources

1. [[vendor-verification-inngest-integration-mode-2]] — Inngest 4.2.6 integration mode verification (serve-mode via `inngest/bun`, connect-worker mode via `inngest/connect`)
2. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — Runtime spec §21.2 (L4302-L4310), §10.3 (L1549), §1 execution ownership law (L50-L65)
3. [[rawr-canonical-architecture-spec-source]] — Arch-spec §13.2 (L2194-L2211), §17.8 (L2709-L2718), §11.3 async role (L1883-L1897)
4. `research/temp/contradiction-graph.json` — cluster `inngest-integration-mode-unspecified-at-architecture-level`
5. `research/temp/source-analysis-arch-spec.md` — §6.2 (Inngest integration mode gap)
6. `research/temp/source-analysis-runtime-spec.md` — §21 (harness and native boundary contracts)
7. `/tools/runtime-realization-type-env/evidence/vendors/inngest.md` — Lab evidence (inngest 3.51.0, serve-mode only in Phase Two/Three)
