# Workflow: Explicit Curated Agent-Plugin Lifecycle

> **Canonical channel**: `rawr agent plugins ...`
>
> **Related**: [[lifecycle-contract.md]],
> [[plugins/agents/hq/workflows/lifecycle-agent-plugin.md]], and
> [[docs/process/HQ_OPERATIONS.md]].

## Before Operations

1. Use an installed immutable controller release.
2. Select exactly one requested operation.
3. Bind only that operation's authority inputs from the selector below.
4. Use explicit disposable provider homes until canonical settlement is authorized.

There is no universal checkout, clean-worktree, or preflight-check requirement.
A branch that consumes an immutable artifact, governed channel, or governance
object does not reopen source as preparation.

## Operation Selector

<operation-selector>
<branch operation="status vendors|update vendors">
Bind exact content-workspace repository coordinates. For update, also bind only
the selected vendor-source ids. Status inspects; update authors reviewable
source bytes. Neither continues into check or build.
</branch>

<branch operation="check|build">
Bind the exact content workspace, repository identity, content authority,
remote, ref, source commit and tree, release-input path, plugin root, and either
one plugin or the complete-set selection. Check is nonpublishing. Build performs
its own validation and returns immutable handles; it does not require a prior
check invocation.
</branch>

<branch operation="package">
Bind one immutable artifact handle, exact package format, and explicit output
path. Verify deterministic package bytes. Do not bind or inspect content source.
</branch>

<branch operation="test">
Bind immutable targeted-release handles or one immutable complete-set handle,
an exact evaluation profile, and explicit provider homes and executables.
Targeted testing does not create a canonical channel claim.
</branch>

<branch operation="sync|status">
Bind the governed current-main channel locator and explicit provider homes and
executables. Status inspects without mutation. Sync converges only the selected
immutable complete set, including removal of omitted lifecycle-owned members;
repeat it and prove live managed state does not change.
</branch>

<branch operation="check --mode current-main-selection">
Bind one explicit content workspace, expected repository identity, and Git
executable. Resolve the fixed reviewed current-main v2 record without starting
provider convergence.
</branch>

<branch operation="check --mode current-main-record">
Encode or validate the one reviewed current-main v2 record. Return its exact
canonical bytes without writing a content repository or acquiring Git/provider
authority.
</branch>

</operation-selector>

After the selected branch records its result and owner proof, stop. A later
operation requires a new explicit selection and its own authority inputs.

## Failure Modes

<failure-modes>
<failure name="mixed-channel">
**Symptom**: curated content is being routed through `rawr plugins ...`.
**Fix**: stop and select the exact `rawr agent plugins ...` operation.
</failure>
<failure name="authoring-chain">
**Symptom**: source creation or review automatically starts build or convergence.
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
