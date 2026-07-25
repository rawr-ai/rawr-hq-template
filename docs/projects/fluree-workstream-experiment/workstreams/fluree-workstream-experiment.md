# Fluree Work-Stream Experiment

Status: `active-draft`.
Branch: `fluree-workstream-experiment`.
PR: `none`.
Commit: `see git history`.
DRA: Claude (host agent).
Dates: `2026-07-25 -> active`.

This record preserves state and handoff context for one bounded workstream. It
is not architecture authority, product authority, a program definition,
sequence authority, or a live task board.

## Workstream State

Workstream record path:
`docs/projects/fluree-workstream-experiment/workstreams/fluree-workstream-experiment.md`

Status: framing complete, execution not started.

DRA: Claude, host agent. Role not transferred.

Branch/stack: `fluree-workstream-experiment`, branched off
`codex/close-research-experiment-design-review` (`d9d5c954`), which is the top
of the research-experiment stack. Worktree:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-fluree-workstream`.

Current phase: Phase 0 — Frame (this document).

Selected skills: `habitat:workstream-runner` (this frame),
`habitat:workstream-review-loops` (review lane, later).

Selected agents: none yet. Companion stewards are read-only and deferred until
there is proof state to audit.

Selected hooks: repo defaults only.

## Frame

Objective:

Model the simplest thing that is genuinely a work stream — a frame through which
work moves, with an iterator that advances it and a feedback loop that re-admits
whatever does not fit — and build it in this repo's architectural shape
(service + resource + provider + plugin + application) on top of Fluree as the
temporal graph substrate. The experiment's question is not "does Fluree work"
but **what does context-over-time buy a work stream that a flat store does not**.

Containment boundary:

- One new service: `workstream-frame`.
- One new resource contract: `semantic-ledger`.
- Two providers for that resource: `fluree-http` (real) and `memory` (test).
- One new CLI command plugin projecting the service.
- App/profile selection facts in the existing HQ app. No new app.
- No modification of existing services, resources, or the research-experiment
  change under `openspec/changes/consolidate-research-experiment-sdk/`.

Primitive boundary:

This is one workstream, not a program. Phases below are internal mechanics. The
experiment is a probe, not a product commitment; nothing here becomes law for
the Habitat work-stream concept without a separate decision.

Non-goals:

- Not a re-implementation of the canonical workstream system spec.
- Not a steward runtime, activation router, Inngest/async surface, or RFD engine.
- Not a distributed tension ledger. Cross-domain propagation is modelled at the
  smallest honest scale (within one stream) and explicitly stops there.
- Not a general Fluree client library or SDK package.
- No study/benchmark content, no model calls, no usage-consuming trials.

Done means:

1. A running `push` advances one item through the frame's boundaries, and a
   rejection at any boundary produces a derived input item linked to its cause,
   which then re-enters the same frame.
2. `inspect` returns durable stream truth, and `inspect --at <t>` returns the
   same stream as of an earlier commit — proving temporal context is real, not
   narrated. (Folded `replay` into `inspect` as a parameter rather than adding a
   sixth operation; same proof, smaller surface.)
3. The `semantic-ledger` resource contract is satisfied by both providers, and
   the service is provider-agnostic (proved by the memory provider passing the
   same behavior tests).
4. A written finding answers the actual question: what the temporal graph
   enabled that a flat table would not, stated with evidence and with the
   negative cases named.

## Opening Packet

Opening input:

User request to build a deliberately lightweight Fluree probe expressing the
Habitat work-stream concept in the repo's own architectural ontology, preceded
by a research/orientation pass across the RAWR projects directory, this repo's
branches, and the sibling `rawr-hq` repo.

Authority inputs:

- `.habitat/AUTHORITY.md` and `.habitat/blueprints/**` — structural law for
  service, plugin, and app kinds. This is the binding constraint on shape.
- `services/example-todo/**` — the canonical service spine exemplar
  (`base.ts` → `contract.ts` → `impl.ts` → `router.ts` → `modules/*`).
- `resources/content-workspace/**` — the canonical resource+provider exemplar
  (contract at package root, providers under `providers/<name>/`).
- `openspec/changes/consolidate-research-experiment-sdk/{proposal,design}.md`
  and `specs/research-experiment-service/spec.md` — the worked example of this
  exact suite shape (service + resource + provider + CLI plugin + app profile).
  Treated as **pattern authority**, not as scope.
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
  — service runtime boundary contract.

Coordination inputs:

- `habitat:workstream-runner` skill (frame, records, packets, closure).
- `habitat:workstream-review-loops` skill (review lane design).

Evidence inputs (conceptual model — read, extracted, not authority over code):

- `~/Documents/projects/RAWR/essays/activation-model.pdf` — signal taxonomy,
  activation routing, governance-as-reconciliation, the complete reactive loop.
  This is the entry point the user named.
- `~/Documents/projects/RAWR/essays/steward-bootstrap-blueprint.pdf` — the
  dependency chain orient → observe → tensions → govern → loop.
- `~/Documents/projects/RAWR/essays/tension-mechanism.pdf` — tension logging,
  propagation along topology, and the three polarities: cohesion, indifference,
  tension.
- `~/Documents/projects/RAWR/essays/RAWR_Workstream_Phase_Model.pdf` — one DRA
  per workstream; phase-based advance with an exit artifact per phase.
- `rawr-hq @ codex/steward-skills-habitat:.habitat/skills/agents/steward-skills/**`
  — a real steward knowledge home: `core/operating-loop.md` (the recursive
  receive → locate → gather → classify → act → verify → record → prune loop),
  `core/authority-model.md` (claim strength ladder), `graph/ontology.md`
  (entity and relationship types).
- `https://github.com/fluree/db` — capability check, see Findings F1.

Excluded or stale inputs:

- `packages/research-sdk` — under active deletion by the research-experiment
  change. Do not build on it, do not extend it.
- `docs/projects/**/quarantine/**` — provenance only, never current guidance.
- The heavy framing in the opening request (turbulence, blockchain, Git-like
  data interface) is retained as intent, explicitly **not** as build scope. The
  user reduced scope to the concrete ask.

Control inputs:

- **Pending:** a parallel "map generation" conversation the user intends to
  paste, flagged as structurally similar (a pipeline that pushes everything
  through it). Not yet received. See Stop conditions.

Stop/escalation conditions:

1. **Runtime provisioning gate.** The research-experiment proposal holds its own
   source behind two prerequisites: an activated Habitat service packet, and
   production app/profile provider selection + bootgraph provisioning + process
   runtime service binding + CLI invocation context. If that machinery is not
   actually runnable on this branch, a new service cannot be wired end-to-end.
   Preflight must verify this before any service source is written. If it is not
   green, stop and report — do not fake the wiring.
2. **Fluree runtime access.** Fluree ships as a Rust binary / Docker image with
   an HTTP API; there is no first-party JS/TS client. If Docker or the binary is
   unavailable, stop before writing the `fluree-http` provider and confirm
   whether to proceed memory-provider-only.
3. Any change that would require editing an existing service, the
   research-experiment openspec change, or `.habitat` law.
4. Arrival of the map-generation input mid-build, if it changes the frame shape.

## Output Contract

Required outputs:

1. This frame record, updated at phase changes.
2. `resources/semantic-ledger/` — resource contract + `memory` and `fluree-http`
   providers.
3. `services/workstream-frame/` — service spine and one `streams` module.
4. One CLI command plugin projecting `push`, `inspect`, `replay`.
5. HQ app/profile selection facts.
6. Behavior tests proving the four Done conditions.
7. A findings document answering the experiment's actual question, including
   what did **not** work.

Optional outputs:

- A second module if, and only if, the first proves too coarse.
- A short note on how this shape would extend to cross-stream tension
  propagation, if the single-stream case earns it.

Claim strength / evidence class:

`verified` requires a passing command recorded with its output. Anything
resting on reading alone is `corroborated` at best. Design intent extracted from
essays is `plausible` and never promoted to law by this workstream.

Surfaces touched: `resources/`, `services/`, `plugins/cli/`, `apps/hq/`,
`docs/projects/fluree-workstream-experiment/`.

Expected gates: `lint`, `typecheck`, `test` for each new package, plus the
Habitat blueprint check for service/plugin/app topology.

## Workflow

Preflight (Phase 0.5 — blocking, before any source):

- P1. Verify the runtime-realization path is actually runnable: can a service be
  selected by an HQ profile, provisioned, bound, and projected through a CLI
  plugin on this branch? Evidence: a green command, not a spec reading.
- P2. Verify Fluree runs locally and answers over HTTP; capture the exact
  transact/query/time-travel/vector call shapes.
- P3. Confirm the Habitat blueprint rules a new service must satisfy, and record
  them as a checklist.

Investigation lanes: host-only. Parallel lanes are not justified at this scale.

Phase teams: single role — the DRA. No delegation planned. If P1 proves the
runtime path is broken, that becomes its own bounded investigation.

Design lock (the model being tested — locked before source):

- A **stream** is a frame with an ordered set of **boundaries**. Boundaries are
  the shape; the shape is the law.
- An **item** is work in the stream. `push` is the iterator: it advances an item
  through every boundary it can clear, and stops at the first it cannot.
- An item's own state is **monotonic**. It never moves backward.
- A boundary failure is not a patch. It **peels off** into a new derived item,
  linked to its cause by an explicit edge, and re-enters the frame as input.
  That edge is the feedback loop, and it is the whole point.
- A stream is done when no item can advance and no derived item is unresolved —
  the essays' reactive equilibrium: run until no new signals are generated.
- Temporal context is Fluree's job: every advance is a commit, so `replay` at
  time `t` reconstructs the stream as it was, not as it is now.
- Similarity/resonance (matching a new peel-off against prior ones) is the one
  place vector search earns its place. If it does not, that is a finding.

Scratch policy: scratch under the session scratchpad, never committed. Extracted
essay text stays in scratch; only findings enter the repo.

## Findings

### F0 — Preflight result: both blocking conditions clear (`verified`)

**P1 — can a new service be wired end-to-end today? Yes, by the pragmatic path.**

`@rawr/hq-sdk/plugins` exports `bindService`, and three shipped CLI command
plugins already use it to bind a service client with `deps`/`scope`/`config` and
a cache key — see
`plugins/cli/commands/session-tools/src/lib/session-intelligence-client.ts`
binding `@rawr/session-intelligence`. Resource providers are constructed at the
app edge: `apps/cli/src/lib/agent-plugins/service-runtime/client.ts` imports
`@rawr/resource-content-workspace/providers/git-effect-platform-node` and hands
the port into the service's deps.

This is an important distinction the frame originally blurred. There are **two**
composition paths in this repo:

- the **shipped** path — `bindService` + edge-constructed providers, in
  production use today; and
- the **target** path — app/profile provider selection, coverage validation,
  bootgraph provisioning, process-runtime binding — which is what the
  research-experiment change's Implementation Gate is waiting on.

This experiment uses the shipped path. That is a deliberate, recorded choice, not
an oversight: it keeps the probe lightweight and it does not pretend the gated
machinery exists. Toolchain verified green in the worktree —
`bun x vitest run --project example-todo` → 6 files, 33 tests passed.

**P2 — does Fluree run and answer? Yes.**

`podman run -d -p 8090:8090 docker.io/fluree/server:latest`, version `4.1.4`,
`{"status":"ok"}` on `/health`. Verified live against the running container:

| Capability | Call | Result |
| --- | --- | --- |
| create ledger | `POST /v1/fluree/create` body `{"ledger":"ws:main"}` | `t:0` + tx-id |
| transact | `POST /v1/fluree/insert?ledger=ws:main` JSON-LD `@graph` | `t` increments, returns commit hash |
| query (FQL) | `POST /v1/fluree/query` `{"from":"ws:main","select":[...],"where":[...]}` | rows |
| query (SPARQL) | same endpoint, `Content-Type: application/sparql-query`, `FROM <ws:main>` | standard SPARQL JSON bindings |
| **time travel** | `from: "ws:main@t:1"` (also `@iso:`, `@recorded:`, `@commit:`) | **`@t:1` → item1 only; `@t:2` → item1 + item2** |

The time-travel result is the decisive one: the same query at two `t` values
returns two different worlds, in both FQL and SPARQL. That is the capability the
experiment is actually testing, and it is real.

Note: `create` takes only `{"ledger"}` — data must follow via `insert`/`upsert`.
A bare `t` field at query top level is silently ignored; the `@t:` suffix on the
ledger ref is the honored form. Both cost me a round trip and are worth
recording.

### F1 — Fluree capability check (`corroborated`, source: github.com/fluree/db)

The user's model is substantially correct, with one correction and one
consequence that changes the build:

- **Confirmed:** SPARQL 1.1, RDF 1.1/1.2, OWL 2 RL + RDFS reasoning, SHACL at
  transaction time. Time travel by transaction number, ISO timestamp, or commit
  id. Git-like branch / rebase / merge / push / pull over datasets. Built-in
  BM25 full-text **and** HNSW vector similarity — not an external service.
  Explicitly positioned for AI agents.
- **Correction:** it is not built on a blockchain. It is a verifiable immutable
  ledger — JWS-signed transactions and Verifiable Credentials. That is a weaker
  and more useful claim than "blockchain", and nothing in this experiment
  depends on the difference.
- **Consequence for the build:** Fluree is a **Rust** binary. There is no
  first-party JS/TS client. Integration is the HTTP API (Docker, port 8090).
  So the `fluree-http` provider is an HTTP adapter, and the `semantic-ledger`
  resource contract must be written provider-neutral rather than shaped around
  a vendor SDK. This is what makes the memory provider worth building: it is the
  proof the contract is real.

### F2 — The suite shape the user believes now exists does exist (`verified`)

`.habitat/blueprints/` carries enforced structural law for `service`,
`plugin-server-api`, `oclif-app`, `oclif-command-plugin`, and `agent-router`
kinds. `services/example-todo` is a complete service spine exemplar and
`resources/content-workspace` a complete resource+provider exemplar (contract at
package root, providers as subdirectories with their own project.json).

More usefully: `openspec/changes/consolidate-research-experiment-sdk/` is a
fully designed instance of **exactly** the suite the user described — one
service, one module, generic resources, resource-local providers, one CLI
command plugin, HQ app + runtime profile selection. Its ontology ledger names
what each kind may and may not own. This experiment should mirror that shape
deliberately; doing so is itself a test of whether the shape generalizes beyond
its first use.

Its Implementation Gate is also a warning: that change holds its own source
until runtime provisioning is proved green. Preflight P1 exists because of it.

### F3 — The steward model, at the scale worth modelling (`plausible`)

From the activation model, tension mechanism, and the `rawr-hq` steward-skills
home, the reactive shape is: **signal → routing → activation with scoped context
→ reconciliation → state commit → observation → possible new signal → loop until
equilibrium.** Tensions are reactive state, not a passive store: crossing a
threshold *is* a signal. Propagated tensions resolve to one of three polarities —
cohesion, indifference, tension.

The simplest honest version of that inside one stream: a boundary rejection is
the signal; the derived item is the tension; re-admission is the activation;
the commit is the state change; equilibrium is the stop condition. Cross-domain
propagation and steward pluralism are deliberately out of scope — modelling them
at this size would be theatre.

### F4 — The base was wrong, and the enforcement machinery proved it (`verified`)

D1 was a mistake and is reversed. The research stack (`d9d5c954`) **diverged**
from `main` at `876ee45c`; `main` carries commits #530–#538 that the stack never
received — service context funnel, module isolation, router authorship,
model-kind indices, agent-router placement/shape, the imported-export JSDoc law,
and Nx project-quality admission.

The symptom was concrete: on the stack top, `bun run habitat` evaluated exactly
**one** rule. On `main` the same command reaches sixteen structure rules plus
two Nx-target rules. Building the experiment on the stack would have meant
building it against almost no enforced law while believing it was enforced.

Reversed to branch from `main` (`aed00eb3`). This also matches the original
request, which named main explicitly.

### F5 — The frame caught a real defect in my own model (`verified`)

The first end-to-end CLI run exposed a bug the unit tests had not: once a derived
item was **resolved**, it fell through to the normal advance path, blocked at the
first boundary it could not clear, and peeled off a child of its own — forever.
The stream could never reach equilibrium.

The fix is a one-line guard with a real design claim behind it: a peel-off exists
to supply one tag to its parent and does not traverse the frame itself. Resolving
it *is* the whole of its work. Whether a peel-off should instead traverse a frame
of its own is a genuine design question, and it is deferred rather than guessed.

Two things are worth keeping from this. First, the defect was invisible to
five green unit tests and obvious in ten lines of CLI output — the projection
earned its place as a verification surface, not just a convenience. Second, the
model's own vocabulary named the bug precisely: work that cannot clear a boundary
peels off, and I had let peel-offs re-enter as though they were ordinary work.

## Outcome Record

Objective outcome: `achieved`.

Residual objective gaps:

- Provider selection sits in the plugin's binding lib rather than an HQ app
  runtime profile. That is the shipped path today, recorded honestly in F0/P1
  rather than faked; the target path is still gated.
- Fluree's differentiating features beyond time travel and graph query — SHACL
  transaction-time validation, OWL/RDFS reasoning, BM25 and HNSW search, and
  branch/merge — are unexercised. Probing confirmed `branch` and `merge`
  endpoints exist (HTTP 400 on empty body, not 404) and ledgers are addressed as
  `name:branch`, but nothing here uses them.

Implementation summary:

| Kind | Artifact |
| --- | --- |
| resource | `resources/semantic-ledger/contract.ts` — append-only temporal graph port, no work-stream vocabulary |
| provider | `resources/semantic-ledger/providers/memory` — in-process fact log |
| provider | `resources/semantic-ledger/providers/fluree-http` — Fluree v4.1.4 HTTP adapter |
| service | `services/workstream-frame` — `streams` module: `open`, `admit`, `push`, `resolve`, `inspect` |
| plugin | `plugins/cli/commands/workstream` — `rawr workstream …` projection |
| application | `apps/cli` — dependency, `oclif.plugins`, and build-dependency groups |

Decisions:

- ~~D1. Branch off the stack top.~~ **Reversed** — see F4. Branched from `main`.
- D2. Mirror the research-experiment suite shape rather than inventing a second
  arrangement of the same kinds. Held.
- D3. Build two providers, not one. A single provider cannot prove the resource
  contract is provider-neutral. Held, and it paid: the whole behaviour suite
  runs twice.
- D4. Model monotonic item state plus a derivation edge, rather than a mutable
  item that moves backward. The feedback loop is a new node, not a rollback.
  Held — position is *derived* by counting `cleared` facts, never stored.
- D5. A peel-off does not traverse the frame. See F5.
- D6. Ground terms are a distinct type from query terms, so a written fact
  cannot contain a variable. Forced by the compiler, kept because it is true.

Evidence: see Findings F0–F5.

Verification:

| Gate | Command | Result |
| --- | --- | --- |
| service + providers | `bun x vitest run --project workstream-frame` | 14 passed — 7 against memory, 7 against live Fluree |
| CLI projection | `bun x vitest run --project plugin-workstream` | 6 passed |
| typecheck | `tsc --noEmit` across service, both providers, plugin (src + test) | clean |
| style | `biome ci --diagnostic-level=error` on all three packages | clean |
| JSDoc law | `require_imported_exports_have_jsdoc/check.mjs` | 0 findings in my packages (repo total 1479 → 1463) |
| Nx admission | `require_nx_project_quality_targets/check.mjs` | pass |
| structure | 16-rule source-law set | 10 failing — **identical to the clean-`main` baseline**, measured by stashing this work and re-running. No regression introduced. |
| end-to-end | live `rawr workstream open/admit/push/resolve/inspect` against Fluree | full loop to completion, plus `--at 2` reconstruction |

## Deferred Inventory

- **Provider selection moves to an HQ app runtime profile.** Owner: future DRA.
  Authority: `openspec/changes/consolidate-research-experiment-sdk/design.md`
  §Context Funnel. Trigger: the gated runtime-realization path lands.
- **Should a peel-off traverse a frame of its own?** Owner: future DRA. Context:
  F5. Trigger: a second frame shape exists to route derived work through.
- **Cross-stream tension propagation and resonance polarity** — cohesion /
  indifference / tension. Authority: `essays/tension-mechanism.pdf`. Trigger: a
  second stream exists to propagate to.
- **Fluree feature ladder** — SHACL at transaction time (the frame's law
  enforced by the substrate rather than by handler code), OWL/RDFS reasoning,
  BM25/HNSW resonance matching, branch/merge as workstream isolation. Trigger:
  the seven-scenario ladder the user requested mid-flight.
- **Async/Inngest projection.** Trigger: a durable scheduled activation earns
  its own product requirement.
- **The pre-existing 10 structure failures and 1463 JSDoc findings on `main`.**
  Not mine, not touched. Trigger: separate remediation workstream.

## Review Result

Leaf loops: self-review against the activated Habitat laws, iterated until the
JSDoc, admission, biome, and typecheck gates were clean and the structure gate
matched its baseline exactly.

Invalidations: D1 reversed (F4). One model defect found and fixed (F5).

Waivers: none.

Repair demands: none outstanding.

## Final Output

Artifacts: see Implementation summary.

Verification run: see Verification table.

Repo/Graphite state: worktree
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-fluree-workstream`,
branch `fluree-workstream-experiment`, branched from `main` (`aed00eb3`). Not
submitted, no PR opened.

## Next Packet

Inspect first: this record's F5 and the Deferred Inventory.

Exact next action: build the seven-scenario ladder the user asked for. The
grounded ordering, given what probing confirmed actually works in Fluree v4.1.4:

1. append-only stream truth (done — this workstream);
2. temporal reconstruction / cold-DRA pickup (done — `inspect --at`);
3. peel-off and derivation edges as graph traversal (done, single-hop);
4. **SHACL at transaction time** — the frame's law enforced by the substrate, so
   an illegal fact is refused rather than prevented by handler code;
5. **OWL/RDFS reasoning** — infer stream-level stall from a chain of blocked
   items;
6. **BM25 / HNSW resonance** — match a new peel-off against prior ones, the
   collision engine from `essays/tension-mechanism.pdf`;
7. **branch / merge** — a workstream on its own ledger branch, merged on
   closure, abandoned without polluting truth.

Steps 4–7 are unproven against v4.1.4 and must be probed before being designed
around, exactly as steps 1–3 were.
