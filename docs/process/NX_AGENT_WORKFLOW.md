# Nx Agent Workflow

This document defines the intended Nx posture for agents working in `RAWR HQ-Template`.

## Core Rule

Use Nx first for workspace truth.

When an agent needs to understand:
- what projects exist
- where a project lives
- what tags or targets a project has
- what generators or tasks are available

the first hop should be the Nx CLI and the official vendored Nx skills, not ad hoc grep or file-by-file exploration.

## Official Nx Skills

Use the official Nx skills if your downstream agent environment installs them globally.

This template repo does not own the canonical managed distribution path for those skills.

## First-Hop Commands

Start with:

```bash
bunx nx show projects
bunx nx show project <project-name> --json
bunx nx graph
```

Use Nx generators and Nx task execution when the relevant official Nx skill indicates that a generator or task is the right workflow.

## Cache And Daemon

Use Nx cache by default.

If unchanged builds keep reporting cache misses, suspect bad task `inputs` / `outputs` before assuming Nx cache is broken.

If you see daemon `EPIPE` errors or a disabled-daemon marker, treat that as a local latency problem first, not proof that cache correctness is broken.

The local recovery loop is:

```bash
bun run nx:reset
bun run nx:doctor
```

If the behavior still looks wrong after that, rerun once with `NX_DAEMON=false` before assuming the workspace config is incorrect.

## Division Of Labor

- **Nx CLI + official Nx skills**: workspace/project truth, targets, generators, task execution conventions
- **AGENTS lattice**: repo routing, ownership boundaries, template-vs-personal destination rules, domain-specific guardrails
- **Narsil**: source-level code intelligence, symbol lookups, references, call paths, semantic/code search

Do not add repo-local `.mcp.json` here.

## Repo Documentation Policy

- Keep repo-owned routing and invariants in `AGENTS.md` and nested `AGENTS.md` files.
- Do not add a repo `CLAUDE.md` just because Nx can generate one.
- Do not turn this template repo into the canonical managed source for globally installed Nx skills.
- Integrate Nx guidance into the existing lattice rather than letting Nx-generated docs overwrite repo-owned router documents.

## Future Seam

This repo intentionally keeps a clean seam between:
- vendor-managed Nx foundation content
- repo-owned routing and domain guidance

That seam should make later AGENTS generation/autostub work easier, but this repo is not introducing AGENTS generation in this slice.

## Deferred

Hosted or managed Nx connectivity is intentionally deferred.

If we revisit it, do it as a hosted/managed service rather than per-client local stdio wiring.

Revisit it only if there is real leverage from:
- shared multi-client connectivity
- Nx Cloud / CI integration
- long-lived process communication that stdio does not handle cleanly
