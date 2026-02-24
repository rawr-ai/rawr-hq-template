# ORPC + Ingest (E‑E‑S‑T) — Domain Packages “Golden Example” Grounding

Created: 2026-02-24  
Repo snapshot: `rawr-hq-template` @ branch `codex/support-example-orpc-unified-golden`, commit `1acfd4db`

## What this doc is

An evolving scratchpad for the “last mile” of integrating ORPC + Ingest (E‑E‑S‑T), focused on clarifying **domain package boundaries** and producing **canonical examples** agents can follow.

This is **not** the final spec; it’s a convergence workspace that should eventually promote stable decisions into `docs/system/` and `docs/process/`.

## Context (cleaned, preserving uncertainties)

We are in the last phase of integrating ORPC and Ingest (E‑E‑S‑T), and trying to develop a stronger set of boundaries for Aragon’s model.

We laid the groundwork/foundation for most of the work; we’re now in the last, most difficult percent.

Recent progress went off the rails while building concrete examples inside the new system:

- We chose the wrong domain for an example (too difficult).
- The examples were implemented incorrectly and didn’t work in the “developer experience” fashion we need.
- AI agents repeatedly built them incorrectly.
- Possible reasons (not fully sure):
  - we didn’t resolve all questions / fully outline everything up front, and/or
  - the system changed and the examples became outdated relative to other changes.
- Agents followed those outdated/incorrect examples and went off track; manual intervention was needed.
- We’re still not making the progress we want.

## Primary goal (right now)

Produce **one “golden” example model** for domain packages that demonstrates scaling from **N‑of‑1** to **N‑of‑infinity** *within the same package*, and becomes the canonical model agents follow.

## The two example packages we need

### 1) ToDo app package (N‑of‑1)

Purpose: demonstrate the *minimal* package structure for something simple with little logic.

Questions it must answer:

- What does the N‑of‑1 file/package structure look like?
- What does the client packaging look like?
- How would that client/package get used by:
  - an API plugin (or another plugin), and
  - a CLI plugin?
- Does the N‑of‑1 structure scale cleanly toward N‑of‑infinity?

### 2) Support example package (N‑of‑3/4/5)

Purpose: demonstrate how a larger service (multiple modules inside a single domain package) should be structured, including how the system/plugins integrate with it.

We should use the **existing support example package** as the golden multi‑module reference.

Together with the ToDo example, this should make the “small → large” scaling story obvious.

## Key boundary question to resolve (affects both examples)

We need to nail down the boundary between “domain packages” and everything else.

Even though the spec defines this, landed changes may differ and/or need further proof/validation.

Specifically: define the composition/relationship between:

- **router**
- **contract**
- **client**

…for domain packages (including internal usage).

Core decision axis:

1) **Pure domain services** (business logic is framework-agnostic), with an ORPC internal/private client wrapped around it
2) **ORPC defines the service directly** (the ORPC router/handlers are the service; “domain” sits inside ORPC)

This choice drives file layout, import direction, test strategy, and how we enforce the domain package boundary.

## Meta-goal (driving all this)

Standardize the setup enough that we can generate a package from our WR / CLI directly, so agents don’t have to wire it themselves. That requires an exact, repeatable domain package structure and integration pattern.

## Notes / constraints observed so far

- Graphite CLI (`gt`) cannot run in this sandbox because it cannot access `~/.local/share/graphite/...` (permission error). We can still preserve Graphite workflow invariants using git directly in this environment.

