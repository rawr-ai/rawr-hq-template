---
name: agent-plugin-management
description: |
  Use when inspecting or operating the governed curated agent-plugin lifecycle: release checks and builds, deterministic packages or exports, provider tests and convergence, promotion attestation, vendor records, status, or controller-owned undo.

  Key triggers: "rawr agent plugins", "curated release set", "agent-plugin status", "provider convergence", "promotion attestation", and "agent-plugin undo".
---

<skill-usage-tracking>

# Agent Plugin Management

Use the Template-owned controller against explicit governed content records and
explicit provider homes. A content checkout is a locator, never controller,
artifact, channel, ledger, receipt, or provider identity.

## Reference Map

| Reference | Path | Purpose |
|---|---|---|
| Operation selector | [[references/workflow.md]] | Owner-specific inputs, convergence, and recovery |
| Lifecycle contract | [[references/lifecycle-contract.md]] | Ownership and completion contract |
| Qualified workflow | [[../../workflows/lifecycle-agent-plugin.md]] | Run exactly one selected lifecycle operation |

## Qualified Command Contract

- Source-only scaffold: `rawr agent plugins create`
- Vendor records: `rawr agent plugins vendors status`, `rawr agent plugins vendors update`
- Release: `rawr agent plugins check`, `rawr agent plugins build`
- Artifact projection: `rawr agent plugins package`, `rawr agent plugins export`
- Native providers: `rawr agent plugins test`, `rawr agent plugins sync`, `rawr agent plugins status`
- Governance: `rawr agent plugins attest-promotion`
- Recovery: `rawr agent plugins undo`

`rawr plugins ...` is a separate native Oclif extension manager. It is never an
alias or compatibility path for curated agent plugins.

## Core Invariants

<invariants>
<invariant name="source-authoring-is-not-release">Authoring changes source only and never starts later operations automatically.</invariant>
<invariant name="closed-release-set">A complete release set is explicit, immutable, and closed-world.</invariant>
<invariant name="one-content-owner">Every skill, workflow, agent, hook, and script releases through exactly one parent agent plugin.</invariant>
<invariant name="truthful-state-owner">Each provider home or export destination has one state owner and its own receipt or ledger.</invariant>
<invariant name="explicit-transition">Inspect, build, package, export, test, sync, promote, and undo remain separate explicit transitions.</invariant>
<invariant name="idempotent-convergence">A repeated converged operation may inspect live state but changes nothing.</invariant>
</invariants>

## Anti-Patterns

- **Mixed channel**: using `rawr plugins ...` for curated content.
- **Authoring side effect**: building or syncing because a source file changed.
- **Destination authority**: treating a provider home, cache, or export as source.
- **Aggregate fallback**: reviving a broad sync or composition path to bridge owners.
- **Hidden continuation**: automatically chaining the next lifecycle operation.

## Grounding

- Controller and generic lifecycle authority live in RAWR HQ-Template.
- Curated content and its governed records live in an independent content repo.
- Active operations guidance: [[docs/process/HQ_OPERATIONS.md]] and
  [[docs/process/CROSS_REPO_WORKFLOWS.md]].

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: [name], [name]" with optional rationale. Omit if no skills invoked. -->
