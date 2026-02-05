# RAWR HQ-Template — Security Hardening Plan (v0, local-first)

This document is a **plan** (not a milestone). It captures principles + a phased roadmap to harden `RAWR HQ-Template` and downstream `RAWR HQ` repos:
- plugin enablement + execution harness
- server/web exposure surfaces
- journaling/logging and state persistence
- dependency/install provenance

**Scope:** local-first `RAWR HQ-Template` baseline (no marketplace, no LLM judge wiring).
**Non-goals (v0):** remote plugin marketplace, signed distribution, hosted execution, LLM-driven policy enforcement.

---

## North-star principles

1) **Default-deny for irreversible actions**
- Anything that mutates the repo, installs dependencies, or executes unknown code requires:
  - a clear “what will happen” plan output (`--dry-run`), and
  - an explicit confirmation gate (`--yes`) or an interactive prompt.

2) **Minimize stored sensitive data**
- Repo-local state under `.rawr/` is gitignored.
- Journal stores metadata + curated snippets only; never default-capture full stdout/stderr.
- No API keys in repo files; env only.

3) **Separate *evaluation* from *execution***
- Security scanning + risk evaluation are pure functions as much as possible.
- Execution entrypoints call evaluators and then proceed; evaluators never mutate.

4) **Small, composable, inspectable commands**
- “Atomic retrieval” APIs (journal search/show) and “atomic mutation” APIs (`rawr hq plugins enable|disable`).
- Favor many small commands + workflow wrappers instead of monolith commands.

5) **Provenance + intent must be recorded**
- When enablement is forced, record:
  - who/what forced, when, and why (structured).
- Every workflow emits a durable snippet summarizing the action.

---

## Threat model (local-first)

### Primary threats
- **Supply chain**: malicious dependency / install script.
- **Local data exposure**: secrets accidentally committed, env leakage to browser, over-broad journaling.
- **Plugin code risk**: a plugin can do anything the local process can do (filesystem/network/exec).
- **Server/web exposure**: unintended endpoints and serving untrusted JS.

### Assumptions
- The operator (you) controls the machine.
- Attackers can influence what code gets introduced (via deps, copy/paste, plugin repos).
- We treat “install/enable plugin” as a risk boundary.

---

## Current posture (as of this plan)

### Already in place
- Repo-local state: `.rawr/state/state.json` (gitignored) for enabled plugins.
- Security checks: `rawr security check` + `rawr hq plugins enable` gate.
- Security posture packet: `rawr security posture` summarizing latest report deterministically.
- Journal primitives: `.rawr/journal/{events,snippets,index.sqlite}` with FTS search; small-result retrieval.
- Server gating: enabled-only server plugin mounts; enabled-only web module serving (`/rawr/plugins/web/:dirName`).
- Bun safeguards: `bunfig.toml` `env=false` (prevents accidental `.env` auto-load into Vite).

### Key gaps to close next
- Permission model for plugins (capabilities: fs/net/exec) — design only for v0.
- Stronger provenance record for forced enablement + enable history.
- Optional: sandboxed execution boundaries (future).

---

## Phased roadmap

### Phase A (now → next): tighten enable/install lifecycle
**Goal:** make “enable plugin” a clearly auditable boundary.

- Add an **enablement history log** (append-only) under `.rawr/state/enablement.log.jsonl`:
  - pluginId, ts, decision (`allowed|blocked|forced`), riskTolerance, mode, report summary hash.
- On `--force`, require `--yes` and a `--reason "<...>"` string.
- Introduce a `rawr plugins explain <id>` command:
  - what the plugin can do (declared + inferred), entrypoints present, last evaluation summary.

Acceptance:
- Every enable/disable/force is recorded.
- “Forced” is never silent.

### Phase B: permissions direction (MCP-like mental model, local)
**Goal:** define a permissions vocabulary without pretending we can fully enforce it yet.

- Define a **capabilities schema** a plugin can declare (docs + optional JSON file in plugin root):
  - `fs.read`, `fs.write`, `net.outbound`, `exec`, `server.routes`, `web.mount`
- Add `rawr plugins perms <id>`:
  - shows declared perms + “observed” hints (static heuristics, not perfect).
- Update docs to make the constraint explicit:
  - “declared != enforced” in v0; enforcement is future work.

Acceptance:
- Users see permissions before enabling.
- The system has a stable schema to harden later.

### Phase C: supply-chain hardening
**Goal:** reduce the blast radius from dependencies and install scripts.

- Keep `bunfig.toml` `trustedDependencies` extremely small and explicit.
- Add a workflow: `rawr workflow deps-audit` (optional) that:
  - runs `bun audit`
  - prints/records diff of `bun.lock` changes
- Add checks for:
  - lockfile drift
  - unexpected postinstall scripts

Acceptance:
- Dependency script execution is consciously opted into.

### Phase D: journaling redaction + retention policy
**Goal:** journaling stays helpful without becoming a liability.

- Define snippet size caps + “never store” categories:
  - secrets, tokens, raw dumps of env.
- Add `rawr journal gc`:
  - keep last N events/snippets (default small) and vacuum sqlite.
- Provide `rawr journal redact --rule <...>` as a future hook (plan only).

Acceptance:
- `.rawr/journal` stays bounded and safe.

### Phase E: server/web hardening
**Goal:** reduce accidental exposure while preserving dev ergonomics.

- Ensure `/rawr/plugins/web/:dirName`:
  - serves enabled-only
  - path traversal safe (dirName allowlist)
  - `cache-control: no-store` (already)
- Add “allowed origins” story for production (plan only).
- Add security headers baseline for served JS and API responses (plan only for v0).

Acceptance:
- Enabled-only serving stays enforced.

---

## “Implementation later” candidates

- LLM judge wiring (parked) for:
  - permission risk assessment
  - data exposure risk heuristics
- Signed plugin artifacts + provenance verification
- OS-level sandboxing for plugin execution
- CI hardening / GitHub Actions gates (later; local-first v0 avoids forcing CI)
