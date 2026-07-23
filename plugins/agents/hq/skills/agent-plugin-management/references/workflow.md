# Workflow: Explicit Curated Agent-Plugin Lifecycle

> **Canonical channel**: `rawr agent plugins ...`
>
> **Related**: [[lifecycle-contract.md]],
> [[plugins/agents/hq/workflows/lifecycle-agent-plugin.md]], and
> [[docs/process/HQ_OPERATIONS.md]].

## Before Operations

1. During the CLI distribution transition, use the Template-owned Oclif app via
   `bun run rawr -- ...` from a clean Template checkout. The ordinary fixed Nx
   Release package is pending; do not invoke the obsolete predecessor distribution.
2. Select exactly one requested operation.
3. Bind only that operation's authority inputs from the table below.
4. Use explicit disposable provider homes until canonical settlement is authorized.

There is no universal checkout, clean-worktree, or preflight-check requirement.
Each branch validates only the exact Git selection, governed record, package
output, or provider home it owns.

## Operation Inputs

<operation-inputs>
<branch operation="status vendors|update vendors">
Bind exact content-workspace repository coordinates. For update, also bind only
the selected vendor-source ids. Status inspects; update authors reviewable
source bytes. Neither continues into check or packaging.
</branch>

<branch operation="check">
Bind the exact content workspace, repository identity, content authority,
remote, ref, source commit and tree, release-input path, plugin root, and either
one plugin or the complete-set selection. Check derives and returns bounded
release facts without publishing lifecycle state.
</branch>

<branch operation="package">
Bind the same exact Git selection, one plugin or the complete set, the package
format, and an explicit output path. Verify deterministic package bytes. A prior
check result is not an ambient prerequisite.
</branch>

<branch operation="test">
Bind the exact Git selection, a targeted or complete-set selection, an exact
evaluation profile, and explicit disposable provider homes and executables.
Targeted testing does not create a canonical channel claim.
</branch>

<branch operation="sync|status">
Bind the governed current-main record locator and explicit provider homes and
executables. Status inspects without mutation. Sync derives and converges only
the selected complete set, including removal of omitted lifecycle-owned members;
repeat it and prove live managed state does not change.
</branch>

<branch operation="check --mode current-main-selection">
Bind one explicit content workspace, expected repository identity, and Git
executable. Resolve the fixed reviewed current-main v3 record without starting
provider convergence.
</branch>

<branch operation="check --mode current-main-record">
Encode or validate the one reviewed current-main v3 record. Return its exact
canonical bytes without writing a content repository or acquiring Git/provider
authority.
</branch>

</operation-inputs>

After the selected branch records its result and owner proof, stop. A later
operation requires a new explicit selection and its own authority inputs.

## Failure Modes

<failure-modes>
<failure name="mixed-channel">
**Symptom**: curated content is being routed through `rawr plugins ...`.
**Fix**: stop and select the exact `rawr agent plugins ...` operation.
</failure>
<failure name="authoring-chain">
**Symptom**: source creation or review automatically starts packaging or convergence.
**Fix**: stop after source proof and require an explicit request for the next transition.
</failure>
<failure name="ambient-authority">
**Symptom**: a worktree, cache, alias, or provider home decides release identity.
**Fix**: bind only the selected branch's exact authority object and target identity.
</failure>
<failure name="false-idempotence">
**Symptom**: repeated sync preserves visible content but rewrites native configuration.
**Fix**: compare live native owner state, not only fresh-process visibility.
</failure>
</failure-modes>
