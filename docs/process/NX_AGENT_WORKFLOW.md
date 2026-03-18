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

This repo vendors the official Nx skill pack.

Canonical skill content lives in:

```bash
plugins/agents/nx/skills/
```

Install or refresh that skill pack through the existing managed agent-plugin sync flow:

```bash
bun run rawr -- plugins sync nx --dry-run --json
bun run rawr -- plugins sync nx
```

That sync path installs the `nx` agent plugin into the configured global Codex homes and Claude local plugin homes. Keep the vendored Nx content official; do not rewrite it into local substitutes.

## First-Hop Commands

Start with:

```bash
bunx nx show projects
bunx nx show project <project-name> --json
bunx nx graph
```

Use Nx generators and Nx task execution when the relevant official Nx skill indicates that a generator or task is the right workflow.

## Division Of Labor

- **Nx CLI + official Nx skills**: workspace/project truth, targets, generators, task execution conventions
- **AGENTS lattice**: repo routing, ownership boundaries, template-vs-personal destination rules, domain-specific guardrails
- **Narsil**: source-level code intelligence, symbol lookups, references, call paths, semantic/code search

Do not add repo-local `.mcp.json` here.

## Repo Documentation Policy

- Keep repo-owned routing and invariants in `AGENTS.md` and nested `AGENTS.md` files.
- Do not add a repo `CLAUDE.md` just because Nx can generate one.
- Do not rely on repo-local `.agents/skills` fanout as the main installation mechanism for Nx here.
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
