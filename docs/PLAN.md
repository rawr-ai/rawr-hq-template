# RAWR v1 (Local‑First) — Plan + Execution Runbook

This file is the **single source of truth** for the RAWR v1 template: architecture, security posture, and the execution workflow (including parallel agents).

> Note: This is a living doc. If implementation choices diverge, update this file rather than letting drift accumulate.

---

## Architecture plan (v1 scope)

### Summary

RAWR is a **GitHub repo template**: a Bun+TypeScript **Turborepo monorepo** whose primary interface is an **oclif CLI** (`rawr`). It’s an AI-oriented “home base” where agents grow durable tools (commands/plugins) instead of scattering scripts.

**Core direction:** local-first AI HQ; marketplace and LLM judge are parked concepts unless explicitly un-parked.

### Target architecture

**Central invariant:** everything “agent-executable” is reachable through `rawr …` commands.

**Runtime components**
- `apps/cli`: oclif CLI (“the headquarters entrypoint”)
- `apps/server` (optional shipped): local HTTP service for long-running tasks, UI hosting, tool bridging
- `apps/web` (optional shipped): minimal React+Vite host shell for micro-frontends
- `packages/*`: shared libraries (plugin SDK, journaling, AI provider interfaces, etc.)
- `plugins/*`: first-class RAWR plugins as workspace packages (oclif plugins + RAWR manifest)

**Control plane**
- `rawr.config.ts` (declared intent)
- `rawr.lock` (resolved pins + provenance) — planned, not implemented yet
  - Trigger to introduce `rawr.lock`: once plugins (or workflows/tools) can be sourced outside the workspace (git URLs/registries/bundles) *or* we need a stable, auditable, repeatable “resolved plugin set” across machines/runs (pin exact artifact + provenance + hashes).

**State**
- Repo-local `.rawr/` (gitignored)
- Optional global `~/.rawr/` (future; not required for v1)

### Plugin model (local-first)

- Primary: **native RAWR plugins** implemented as **oclif plugins** (workspace packages first).
- Secondary (later): **script bundles** imported and wrapped into generated oclif plugin wrappers.

Plugins declare:
- requested permissions/capabilities (network/fs/exec/etc.)
- safety metadata for gating + journaling/redaction

### Security (v1)

Two layers exist conceptually:
1) Deterministic, traditional checks (v1 implements).
2) LLM “judge” risk assessment (parked; doc only).

**v1 enforcement:** gate at `plugins enable` (“gateEnable”).

Deterministic checks (v1):
- Vulnerability scan: `bun audit --json` with configurable threshold
- Script/trust scan: `bun pm untrusted` and explicit `trustedDependencies`
- Sensitive leak scan: local checks for staged changes + repo patterns

Outputs:
- `.rawr/security/reports/...`
- `.rawr/security/decisions.json` (including overrides)

LLM judge: parked in `docs/spikes/SPIKE_LLM_RISK_JUDGE.md` (do not wire or implement).

### Marketplace

Explicitly out of scope for v1. Parked as a future doc in `docs/FUTURE_MARKETPLACE.md`.

---

## Execution runbook (bootstrap + parallel agents)

### Summary

- Immediate repo bootstrap + publication (GitHub org `RAWR-AI`, public, template repo)
- Graphite initialization (stack-first workflow)
- Bun + Turborepo + Vite/Vitest conventions aligned with `civ7-modding-tools`
- Parallel, multi-agent implementation via worktrees

### Part 0 — Repo creation, plan capture, GitHub publish, Graphite init

1) Create local repo directory + initialize Git (`main` trunk).
2) Write this plan into the repo as the first committed content.
3) Create the GitHub repo in org `RAWR-AI` (public), push `main`, mark as template.
4) Initialize Graphite (`gt init --trunk main`) and add `docs/process/GRAPHITE.md`.

### Tooling conventions (baseline)

Match `civ7-modding-tools`:
- root `bunfig.toml`: `env=false`, `install.linker=isolated`, explicit `trustedDependencies`
- root `vitest.config.ts`: multi-project setup
- turbo tasks: `dev` persistent no-cache; `build` and `test` depend on `^build`
- TypeScript: `build` emits `dist/**` (base config allows emit); `typecheck` uses `--noEmit` (web `build` also passes `--noEmit` before Vite)
- `turbo run dev` targets long-running apps only (server + web); CLI uses `dev:cli` if needed

### Parallel agent slicing

Worktrees root:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees`

Branch naming:
`agent-<id>-rawr-<slice>`

In parallel mode:
never run `gt sync` without `--no-restack`.

Slices:
- A: monorepo + turbo baseline
- B: CLI (oclif) + core command base
- C: security gate MVP
- D: server (Elysia)
- E: web host shell (React+Vite)
- F: testing harness + Vitest projects

### Integration order

1) A
2) F + B (order based on file touch minimization; prefer A → F → B)
3) C
4) D
5) E

After each merge: run `bun run test` and `bun run build`.
