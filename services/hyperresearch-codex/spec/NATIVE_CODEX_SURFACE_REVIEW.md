# Native Codex Surface Review

This note records the paired review of whether Hyperresearch should move away from the current `codex-rawr exec` path for child-agent lifecycle proof.

## Verdict

Do not pivot the active parity path to the TypeScript SDK or hosted OpenAI APIs.

The current `codex-rawr exec` plus watchdog diagnostic is still the accepted evidence for the shipped Hyperresearch Codex packet-orchestration path because it tests the runtime surface the current skill/workflow actually uses.

The Codex app-server is the right diagnostic surface, and a focused mock-provider smoke has now confirmed the core failure in a cleaner form. Deep review found that app-server supports the native primitives needed to test start/resume, live reconnect, loaded-thread inspection, `thread/read`, turn streaming, and collaborative-agent lifecycle observation. The smoke then showed cold parent `thread/resume` does not rehydrate pre-resume child handles: `wait` and `closeAgent` against the original child id returned structured `notFound`.

The decisive gap is narrower than before: app-server can observe `spawnAgent`, `resumeAgent`, `wait`, and `closeAgent` lifecycle items, but it does not expose a public promptless RPC such as `agent/wait` or `agent/close`, and public parent `thread/resume` does not appear to call the internal descendant resume path. That means the next proof should be an app-server diagnostic, not a service redesign.

## Deep Research Summary

Two app-server reviewers and two SDK reviewers inspected the local Codex vendor checkout at `/Users/mateicanavra/Documents/.nosync/DEV/habitat/vendors/codex`. The app-server reviewers also exercised the installed `codex-rawr app-server` over stdio with temp `CODEX_HOME` roots and a local mock Responses provider.

Current local binaries observed during review:

- `codex-rawr`: `0.126.0-alpha.3`
- Desktop bundled Codex: `0.128.0-alpha.1`
- legacy `codex`: `0.94.0-alpha.16`

Local app-server probe result:

- `codex-rawr app-server --listen stdio://` initializes successfully from an existing temp `CODEX_HOME`.
- `thread/start` creates a thread and emits `thread/started`.
- `thread/read` works with `includeTurns:false` before a first user turn.
- `thread/loaded/list` returns the freshly created thread id.
- `thread/read includeTurns:true` before a first user turn returns `thread ... is not materialized yet`; the real diagnostic must run a `turn/start` before relying on turn history.
- `thread/loaded/list` requires an explicit `{}` params object on this build.

App-server child-lifecycle smoke result:

- Same-process app-server lifecycle passed: `spawnAgent`, `wait`, and `closeAgent` emitted typed `collabAgentToolCall` items, and wait/close completed for the child.
- Cold parent resume failed: after restarting app-server with the same temp `CODEX_HOME`, `thread/resume` loaded the parent, but `wait` and `closeAgent` against the child spawned before resume failed with `agentsStates.<child>.status = "notFound"`.
- Explicit child resume partially recovered the handle: after cold parent resume, model-driven `resume_agent` against the original child id completed and returned `pending_init`; subsequent `wait` timed out and `closeAgent` returned previous status `pending_init`. No `notFound` status appeared, but clean child completion was still not proven.
- Evidence is preserved under `spec/evidence/20260503T201420Z-app-server-child-lifecycle/`.
- Explicit-child-resume evidence is preserved under `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/`.

## Reviewed Surfaces

### `codex-rawr exec`

Status: current acceptance path.

What it proves:

- the actual RAWR Codex CLI path used by the installed Hyperresearch skill;
- parent-driven `spawn_agent`, `wait`, and `close_agent` in normal same-process turns;
- `codex-rawr exec resume` behavior against persisted parent sessions;
- raw JSONL and stderr evidence for release review.

Current finding:

- same-process child lifecycle works;
- `codex-rawr exec resume` loses access to pre-resume child handles in the child-completion diagnostic.

### Codex TypeScript SDK

Status: rejected as a pivot for the child-handle durability issue.

The local TypeScript SDK is useful for normal programmatic `codex exec` ergonomics. It exposes thread start/resume wrappers, streamed event parsing, output schema forwarding, config/env forwarding, and AbortSignal cancellation.

It is not a stronger surface for `HR-CODEX-035`. The SDK wraps the Codex CLI and exchanges JSONL over stdin/stdout. Its exec implementation builds `codex exec --experimental-json`, and resume appends `resume <threadId>`. Its typed item union does not expose the app-server collaborative-agent lifecycle item surface. Therefore SDK adoption would inherit the same `exec resume` behavior unless a future SDK changes to app-server internally.

Allowed future use:

- a disposable diagnostic runner that reproduces the same `exec` behavior with cleaner TypeScript code;
- non-acceptance ergonomics around ordinary `codex exec` streaming.

Not allowed as parity evidence:

- counting an SDK run as stronger than the current watchdog unless it proves original child ids survive resume;
- moving SDK usage into the Hyperresearch service runtime or reopening service topology.

### Codex App-Server

Status: accepted as the native diagnostic surface; rejected as a fix by current evidence.

The local app-server is native Codex infrastructure. It exposes JSON-RPC over stdio/websocket/unix socket, thread start/resume, turn start, streamed item notifications, loaded-thread status, and collab-agent tool-call items for `spawnAgent`, `wait`, `closeAgent`, `resumeAgent`, and child statuses.

Observed supported primitives:

- `thread/start`: start a fresh parent thread.
- `thread/resume`: resume a parent thread by id/path/history.
- `turn/start`: drive the diagnostic as a normal Codex turn.
- `thread/list`, `thread/loaded/list`, `thread/read`, `thread/turns/list`: load and inspect parent/child diagnostics.
- `item/started`, `item/completed`, `turn/completed`, and `thread/status/changed`: stream lifecycle evidence.
- `collabAgentToolCall` / `CollabAgentToolCall`: observe `spawnAgent`, `sendInput`, `resumeAgent`, `wait`, and `closeAgent`, including receiver thread ids and agent states.

Why it helps:

- it replaces ad hoc JSONL event scraping with typed JSON-RPC notifications plus thread inspection;
- it gives a native live reconnect path: reconnect a second client to an already loaded thread and observe continuing events;
- it can test cold parent resume after app-server restart with the same `CODEX_HOME`;
- it can tell us whether a failure is "history exists but live child handle missing" instead of only "parent wait got stuck."

Why it is not a proven fix:

- public `thread/resume` appears to call the parent `resume_thread_with_history` path, not the internal descendant resume path;
- `AgentControl::resume_agent_from_rollout` exists internally and walks persisted open spawn edges, but the public app-server parent resume path has not been shown to invoke it;
- app-server has no public promptless `agent/spawn`, `agent/wait`, `agent/close`, or `agent/resume` RPC today;
- model-driven `resume_agent` may recover old descendants, but that must be tested explicitly and cannot be assumed.

The app-server smoke returned `NotFound` for original child handles after cold resume. That improves evidence quality but does not close `HR-CODEX-035`.

If a future true websocket live reconnect passes but cold resume remains failed, the conclusion is:

- loaded-thread reconnect is sufficient for same-process or same-server UI ergonomics;
- durable post-process child handle completion still needs a Codex runtime fix or an explicit parity re-scope.

The model-driven `resume_agent` variant has now been run:

- app-server can recover the original child handle through an explicit child-resume turn, avoiding `notFound`;
- the recovered child remained `pendingInit`;
- `wait` timed out rather than observing final child completion;
- parent `thread/resume` alone still does not rehydrate child handles automatically.

Potential Codex runtime fixes, if required:

- add experimental public `agent/resume`, `agent/wait`, and `agent/close` app-server RPCs backed by `AgentControl`;
- or add an opt-in `thread/resume { resumeOpenDescendants: true }` mode that invokes descendant resume. This changes lifecycle semantics and should remain explicit.

### OpenAI SDK / Responses API / Agents SDK

Status: rejected for Hyperresearch Codex parity.

The OpenAI API stack is a hosted model/tool orchestration surface. It does not provide local Codex workspace sessions, RAWR custom agents, Codex rollout files, `spawn_agent`/`wait`/`close_agent`, local repo permissions, or the installed RAWR skill/plugin path. Using it would be a new agent runtime, not a Codex parity repair.

## Next Native-Surface Packet

The next native-surface packet is no longer "prove whether app-server can observe this" or "try explicit child resume." Both are proven. The next packet should implement/fix descendant rehydration or resumed-child execution in Codex/RAWR, or explicitly re-scope the child lifecycle claim.

Minimum remaining packet:

1. Use the app-server evidence bundle as the preferred regression harness.
2. Fix Codex/RAWR so recovered descendants either resume running or are classified in a way the parent can deterministically replace without pretending clean completion.
3. Candidate API shapes are `thread/resume { resumeOpenDescendants: true }` or public experimental `agent/resume`, `agent/wait`, and `agent/close` RPCs backed by `AgentControl`.
4. Closure requires original child ids to reach final completed state after cold resume, or an explicit parity re-scope that states cold-resumed pending children require replacement packet outputs.

Each app-server scenario manifest should add these fields:

```json
{
  "surface": "codex app-server",
  "transport": "stdio",
  "threadResumeMode": "cold_resume_explicit_child_resume",
  "rawJsonRpcLog": "jsonrpc/app-server-cold-resume.jsonl",
  "collabEventsObserved": true,
  "directChildLifecycleApiObserved": false,
  "parentThreadId": "019...",
  "originalChildThreadIds": ["019..."],
  "threadReadIncludedTurns": true,
  "loadedThreadIdsBeforeResume": ["019..."],
  "loadedThreadIdsAfterResume": ["019..."],
  "collabToolsObserved": ["spawnAgent", "resumeAgent", "wait", "closeAgent"],
  "notFoundStatuses": []
}
```

The app-server evidence is now stronger than the Bash watchdog for the cold-resume failure. It should be used as the preferred reproduction when changing Codex/RAWR runtime descendant resume behavior. The current failed `exec resume` diagnostic remains the accepted installed-skill runtime finding for `HR-CODEX-035`.

## Source Pointers

Local source pointers used for the decision:

- `codex-rs/app-server/README.md`: JSON-RPC transports, lifecycle, thread/read, loaded threads, item events, and experimental API opt-in.
- `codex-rs/app-server-protocol/src/protocol/common.rs`: public app-server request methods including `thread/start`, `thread/resume`, `thread/loaded/list`, `thread/read`, and `turn/start`.
- `codex-rs/app-server-protocol/src/protocol/v2.rs`: `ThreadItem::CollabAgentToolCall`, `CollabAgentTool`, and `CollabAgentStatus`.
- `codex-rs/app-server/src/codex_message_processor.rs`: public `thread/resume` path calls parent `resume_thread_with_history`.
- `codex-rs/core/src/thread_manager.rs`: `resume_thread_with_history` spawns a resumed parent thread with fresh agent control.
- `codex-rs/core/src/agent/control.rs`: internal `resume_agent_from_rollout` can recursively resume open spawn descendants.
- `sdk/typescript/src/exec.ts`: TypeScript SDK invokes `codex exec --experimental-json` and appends `resume <threadId>`.

## Review Notes

- The originally referenced fork path `/Users/mateicanavra/Documents/.nosync/DEV/rawr-ai/codex` was not present for the review agents. They inspected the available local Codex checkout under `/Users/mateicanavra/Documents/.nosync/DEV/habitat/vendors/codex`.
- Public upstream signals checked during review are consistent with this boundary: the published TypeScript SDK README says it wraps the Codex CLI, while app-server public issue traffic still shows thread/resume/history/reconnect edge cases as active work. Treat local source and local probes as the authority for this RAWR fork.
- MCP remains parked and was not part of this review.
- Hooks remain separate and were not part of this review.
