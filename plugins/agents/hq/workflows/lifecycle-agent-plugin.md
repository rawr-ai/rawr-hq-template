---
description: Run one explicitly selected curated agent-plugin lifecycle operation
argument-hint: "OPERATION=<qualified operation> plus its owner-specific inputs"
---

# Lifecycle: Curated Agent Plugin

Use the Template-owned immutable controller and run exactly one selected
operation. Follow [[../skills/agent-plugin-management/references/lifecycle-contract.md]]
for authority and [[../skills/agent-plugin-management/references/workflow.md]]
for the complete operation selector.

## Boundary

- `rawr agent plugins ...` is the only curated agent-plugin lifecycle channel.
- `rawr plugins ...` is only for external Oclif extensions.
- Skill, workflow, agent, hook, and script changes release through their parent
  agent plugin. They do not get independent lifecycle identities.
- The content repository owns curated content and governed records; RAWR
  HQ-Template owns the controller and generic lifecycle tooling.
- Source authoring is separate, source-only work. It never starts this workflow.
- App, web, and runtime composition are outside this workflow.
- No operation automatically starts check, build, package, test, or sync.

## Select One Branch

- **Vendors, check, or build**: bind the explicit content workspace and its exact
  governed Git coordinates. Vendor update also binds selected source ids;
  check/build bind one plugin or the complete-set selection. Run source tests or
  dependent-reference audits only when they are proof for this source branch.
- **Current-main record**: use `check --mode current-main-record` to encode or
  validate the single reviewed v2 record before it lands in the content
  repository. Use `check --mode current-main-selection` to inspect the landed
  record through observed Git without provider mutation.
- **Package**: bind the immutable artifact handle, exact format, and explicit
  output path. Do not reopen a content checkout.
- **Test**: bind immutable targeted-release handles or one immutable complete-set
  handle, an evaluation profile, and explicit provider homes and executables.
- **Sync or status**: bind the governed current-main channel locator and explicit
  provider homes and executables. Sync removes omitted lifecycle-owned members;
  do not infer a set by scanning source.

Invoke the exact literal qualified command selected by `OPERATION`. Keep
`rawr agent plugins status vendors` and `rawr agent plugins update vendors` as
two-word subcommand paths rather than treating `vendors` as an aggregate
operation or shell-expanding a compound operation string.

## Done

- The selected command accepted its exact owner-specific inputs.
- Its output identity or owner-state proof matches that branch.
- A repeated mutating convergence changes nothing when that branch requires it.
- No unselected operation ran and no unrelated owner state changed.
