# Design Discussion “Book” — ORPC + Inngest Domain Packages

This document is the **operator’s handbook** for running our upcoming design discussions and decision-making process.

Goal: converge quickly (without “reopening the whole book”) on a single canonical **domain package model** that supports:
- **N-of-1** (ToDo) minimal example, and
- **N-of-∞** scalable capability packages (using `@rawr/support-example` as the multi-module reference),
…while staying aligned with the locked ORPC+Inngest spec packet posture.

---

## 0) Session start ritual (mandatory)

### 0.1 Create *this session’s* scratchpad (ephemeral)

- Create **a new scratchpad per session**.
- Store scratchpads outside the repo (default): `/tmp/rawr-hq-template-scratchpads/<session-id>/`
- Scratchpads can be deleted until we decide to “integrate” them into canonical docs.
- Use scratchpads to keep heavy context out of the main working thread and resilient to compaction.

Scratchpad structure (recommended):

```txt
/tmp/rawr-hq-template-scratchpads/<session-id>/
  main.md
  agents/
    option-a.md
    option-b.md
    option-c.md
    spec-reconciler.md
    dx-generator.md
    test-harness.md
  artifacts/
    diagrams/
    trees/
```

### 0.2 Write down the “state of the world” (2–5 minutes)

In `main.md`, record:
- date/time, branch/commit, what we’re trying to decide today,
- what is locked (we won’t relitigate unless we explicitly escalate),
- what evidence we plan to inspect (docs + code paths),
- the next “decision sprint” we’re running.

### 0.3 Repo hygiene (quick check)

- Confirm clean working tree (or explicitly name why not).
- Don’t accumulate untracked scratch notes in the repo root (scratchpads live in `/tmp` by default).

---

## 1) Team design (mandatory for any multi-agent pass)

We use an **Orchestrator + Specialists** topology:
- Orchestrator (this session owner) is the **DRI** for decisions and synthesis.
- Specialists own independent option packets and return artifacts; they do not negotiate with each other directly.

Context distribution is **layered**:
- **Layer 1 (task brief)**: each agent’s option/task prompt + success criteria.
- **Layer 2 (team context)**: a small shared “locks + glossary + evaluation rubric” snippet.
- **Layer 3 (reference context)**: spec packet docs + our `GROUNDING.md`.
- **Layer 4 (artifact context)**: specific code paths, examples, diagrams.

Accountability pattern:
- **DRI**: orchestrator owns each decision outcome.
- Specialists are **responsible** for producing their option artifacts and identifying risks/unknowns.

---

## 2) Agent protocol (required)

### 2.1 Each agent keeps their *own* scratchpad

Each specialist writes/maintains its own scratchpad file under the session scratchpad directory.

### 2.2 Grounding checklist (agent must do before producing opinions)

Each agent must:
1) Read the relevant team-design guidance (at least: topology + context distribution + accountability).
2) Read the spec packet sources relevant to the decision:
   - `docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
   - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
   - `docs/projects/orpc-ingest-workflows-spec/axes/01-external-client-generation.md`
   - `docs/projects/orpc-ingest-workflows-spec/axes/02-internal-clients.md`
   - plus any axis doc explicitly implicated by the option’s argument
3) Read the codebase areas implicated by the decision:
   - `packages/support-example/**` (current “example domain package” truth)
   - `plugins/api/support-example/**` (boundary plugin delegation truth)
   - `plugins/workflows/support-example/**` (Inngest orchestration truth)
   - `rawr.hq.ts` and host composition points in `apps/server/**` (mounting + context)
   - one “contract-first” contrast package (e.g. `packages/state/**`)
4) Introspect relevant skills (as applicable to the option):
   - `orpc`
   - `inngest`
   - `system-design`
   - `team-design` (always, for multi-agent work)

### 2.3 Compaction step

After grounding + collecting evidence, orchestrator sends the agent a **`/compact`** message.
Then the agent proceeds on the actual task using only:
- its scratchpad,
- the locked spec posture,
- and the minimal task brief.

This avoids context bloat and forces crisp reasoning.

### 2.4 Standard option packet (artifact format)

Every option agent must produce:
1) **1-page writeup**: the model + why it wins + what it breaks.
2) **File-tree sketches** for:
   - ToDo (N=1)
   - support-example (N=3/4/5)
3) **Import direction** bullet list (what may import what).
4) **Integration flows** (API plugin, workflows/Inngest, CLI offline + optional online).
5) **Gotchas + guardrails**: top 3–5 agent-failure modes and how this option prevents them.
6) **Validation plan**: what to inspect in docs/code to prove the claims.

Specialist variants:
- Spec reconciler: contradictions + which locks are violated + exact exception wording if needed.
- DX/generator: scaffold contract + drift/failure modes + enforcement ideas.
- Test/harness: minimal test matrix + where it would live + what it catches.

---

## 3) The discussion workflow: “Decision Sprints”

For each decision:
1) **Frame**: write decision question + what it blocks + “non-goals”.
2) **Optionize**: list 2–3 mutually exclusive options.
3) **Parallelize**: assign one agent per option + reconciler + DX + test.
4) **Compare**: score options against a shared rubric:
   - agent-proofing, N=1 minimality, N=∞ scalability, boundary integrity, surface compatibility, spec alignment
5) **Validate**: run the smallest inspection needed to confirm the winner.
6) **Lock**: record the decision (and any exceptions) in:
   - `docs/projects/orpc-ingest-domain-packages/GROUNDING.md`
   - this session’s scratchpad (`main.md`)
7) **Park**: list follow-ups; do not derail.

---

## 4) Canonical references for this project

- Evolving convergence scratch: `docs/projects/orpc-ingest-domain-packages/GROUNDING.md`
- Spec packet authority: `docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`, `DECISIONS.md`, `axes/*`

