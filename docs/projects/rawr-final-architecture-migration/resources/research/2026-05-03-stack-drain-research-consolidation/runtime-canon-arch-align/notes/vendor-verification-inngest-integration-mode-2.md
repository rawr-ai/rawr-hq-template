---
title: Vendor Verification — Inngest integration mode
id: vendor-verification-inngest-integration-mode-2
tags:
- runtime-canon-arch-align
- kind:vendor-verification
created: '2026-05-02T20:52:56.769667Z'
status: draft
type: note
deprecated: false
summary: 'Inngest 4.2.6 has two distinct integration modes: serve-mode (HTTP handler,
  inbound) and connect-worker mode (outbound WebSocket). The RAWR arch-spec does not
  specify which mode is used for the async harness. This is an architecture-level
  gap — the choice determines whether the async process exposes HTTP or makes an outbound
  connection.'
---

# Vendor Verification — Inngest Integration Mode

**Technology:** Inngest
**Version verified:** 4.2.6 (latest as of 2026-05-02)
**Source:** https://registry.npmjs.org/inngest/4.2.6 (exports), https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/bun.ts, https://raw.githubusercontent.com/inngest/inngest-js/main/packages/inngest/src/components/connect/index.ts
**Relevance:** The RAWR canonical architecture spec shows `FunctionBundle -> Inngest harness` as the async stack terminal without specifying whether this is HTTP serve-mode or outbound connect-worker (WebSocket) mode. This distinction is architecturally significant — it changes the network topology and harness integration shape.

## Verified Facts

### Two distinct integration modes confirmed in Inngest 4.x:

**1. Serve-mode (HTTP handler)**
- Confirmed via `inngest/bun` adapter (and many other framework adapters: h3, hono, next, node, express, fastify, etc.)
- Pattern: A Bun (or Express/Hono/etc.) HTTP server registers an endpoint (e.g., `/api/inngest`) that serves Inngest function definitions AND handles execution requests
- Inngest's cloud infrastructure polls this endpoint (or the app registers its URL with Inngest)
- Requires inbound HTTP access from Inngest cloud to the running process
- Code shape: `serve({ client: inngest, functions })(request)` mounted on an HTTP route

**2. Connect-worker mode (outbound WebSocket persistent connection)**
- Confirmed via `inngest/connect` export
- Pattern: Process initiates an outbound WebSocket connection to Inngest's gateway infrastructure
- `WebSocketWorkerConnection` class is the implementation
- Does NOT require inbound HTTP access — the process connects OUT
- Supports `isolateExecution` (worker thread isolation per execution)
- Supports `maxWorkerConcurrency`
- Supports `gatewayUrl` configuration (pointing to a specific Inngest gateway)
- Code shape: `connect({ apps: [{ client: inngest, functions }] })`

## Architecture-Level Implications for RAWR

The RAWR canonical architecture spec (arch-spec L2178–L2192) shows the async process stack as:
```
services/* -> plugins/async/* -> AppDefinition -> startApp(...) -> SDK -> compiler -> bootgraph/kernel -> process runtime and async surface adapter -> FunctionBundle -> Inngest harness
```

This diagram does not specify whether the Inngest harness is mounted in serve-mode or connect-worker mode. The choice matters because:

- **Serve-mode**: The Inngest harness is mounted as an HTTP route handler inside the existing Elysia server. This means the async role's Inngest endpoint is likely co-hosted on the same HTTP server as the RAWR server role — or runs a separate HTTP server on a different port. The `FunctionBundle` gets served as HTTP responses.

- **Connect-worker mode**: The Inngest harness initiates an outbound WebSocket connection. This means the async process does NOT need to expose an HTTP port for Inngest. The `FunctionBundle` functions are registered over the WebSocket. This is a fundamentally different network topology than serve-mode.

The arch-spec's separate async entrypoint (`apps/hq/async.ts -> process 2`, arch-spec L2313) implies the async process runs independently, which is compatible with EITHER mode. But the harness integration shape is different in each case.

## Claim vs Actual Judgement

| Arch-spec claim | Actual Inngest 4.x state | Verdict |
|---|---|---|
| Inngest is the default durability harness | CONFIRMED — Inngest is the primary durable workflow platform | ACCURATE |
| FunctionBundle -> Inngest harness as terminal | PLAUSIBLE — The FunctionBundle concept maps to Inngest's function registration; whether via serve or connect is unspecified | INTEGRATION GAP (arch-spec silent on mode) |
| Inngest owns durable async execution semantics | CONFIRMED — Inngest runs retries, schedules, consumers, event-driven workflows | ACCURATE |
| Async process stack terminates at Inngest harness | ACCURATE at a high level — the mode (serve vs connect-worker) is the unspecified detail | INCOMPLETE |

## Alignment Recommendation Impact

The arch-spec's silent choice of Inngest integration mode is a real gap. The runtime realization spec likely specifies whether RAWR uses serve-mode (HTTP handler mounted on Elysia or standalone Bun server) or connect-worker mode (outbound WebSocket). If the runtime spec has adopted connect-worker mode (which is architecturally preferable for processes that don't want to expose HTTP for Inngest), the arch-spec's implied network topology (the async role as a listener) would need updating.

The arch-spec should add, at minimum, a sentence noting whether the async harness uses serve-mode or connect-worker mode, since this determines whether the async process exposes an HTTP endpoint or makes an outbound connection — a meaningful system-architecture distinction.
