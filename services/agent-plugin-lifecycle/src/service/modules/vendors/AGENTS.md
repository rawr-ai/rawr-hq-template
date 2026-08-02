# Agent Plugin Vendor Authoring Module Router

## Purpose

- Observe declared vendored sources and safely author admitted fast-forward
  updates into the content workspace.

## Scope

- Applies to vendor status and update capabilities in this module directory.

## Boundaries

- Vendor declarations and current workspace content are the authoring
  authority; upstream repositories are observations, not automatic inputs.
- The module does not select releases, package outputs, or converge native
  provider state.
- Remote versioned-content facts, including exact materialized blob bytes,
  remain behind their resource; local Git and filesystem transitions remain
  behind content-workspace. Vendor policy does not reconstruct either
  resource's mechanical validation.

## Behavior

- The module compares admitted and upstream identities, honors held sources,
  rejects divergence or payload mismatch, materializes valid candidates, and
  executes a bounded authoring transaction. It rejects an upstream that changes
  between observation and materialization before authoring begins.

## Concepts

- A **declared vendor source** carries admitted identity and policy. **Held**
  sources cannot advance; a **fast-forward candidate** may produce a new
  curation revision; an **authoring plan** is the exact workspace transition.

## Flow

- Status observes all declarations and upstreams without mutation. Update
  selects explicit source ids, assesses and materializes candidates, builds a
  plan, and applies it through one workspace transaction.

## Interfaces

- `status` and `update` are the caller operations. Content-workspace
  observation and mutation, remote versioned-content observation and
  materialization, and the clock enter through module context.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Release module](../releases/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:test` for vendor status,
  held/diverged sources, authoring plans, rollback, and update settlement.
