<!-- quarantine-ledger: true -->

# Runtime Realignment Baseline Ledger

## Purpose

- Preserve the pre-realignment canonical documents intact for semantic review
  without treating their historical execution constraints as current law.
- This is a transient migration ledger, not architecture or runtime authority.

## Scope

- Applies to this directory and its two baseline snapshots, captured from
  `374149800a067e527342e334ff6a3022fbd38cd7` on 2026-09-04.

## Boundaries

- Snapshot bodies are immutable provenance. Do not execute their commands or
  follow their task-status, source-inventory, receipt, or next-node instructions.
- Relative links inside the snapshots retain their original canonical-path
  context. They were intentionally not rewritten during preservation.
- Current explicit owner intent and active canonical successors win conflicts.

## Behavior

- Mine a snapshot only to compare an exact prior claim with its current owner.
- Promote a useful claim through a reviewed edit to active authority, never by
  relabeling a snapshot as current guidance.

## Concepts

- A baseline snapshot is byte-identical evidence of the prior mixed document.
- An active successor retains the canonical path and reconciles current law;
  it does not delegate authority to this ledger or the snapshots.

## Inventory

| Quarantined path | Original role | Why quarantined | Still useful for | Conflict rule | Promotion condition |
| --- | --- | --- | --- | --- | --- |
| `HABITAT_ARCHITECTURE.md` | Canonical platform architecture | Mixed enduring owner/lifecycle law with task status, receipts, private file inventories, and publication counts | Exact prior architectural claims and their runtime routing | Active `docs/system/HABITAT_ARCHITECTURE.md` wins | No whole-document promotion; individual claims require evidence-backed reconciliation into the active owner |
| `HABITAT_RUNTIME_REALIZATION.md` | Canonical runtime mechanics | Mixed runtime contracts with historical task corpora, implementation ceilings, no-op audit receipts, and proof sequencing | Exact prior types, algorithms, handoffs, and the implementation constraints removed during realignment | Active `docs/system/HABITAT_RUNTIME_REALIZATION.md` wins | No whole-document promotion; individual claims require evidence-backed reconciliation into the active owner |

## Flow

- Start from active system authority. Enter this ledger only when an exact
  historical claim is relevant to review, then return to its active owner.

## Interfaces

- Baseline architecture SHA-256:
  `5b922baeb46d539ffc7aa929e963993d118f60f9f6ddf9d9d2565840a9d05415`.
- Baseline runtime SHA-256:
  `0ceb5f171afc3eb156ff77c3c4fa59d6c2d31059ca6b705837833291923a4349`.
- These content hashes prove preservation, not current conformance.

## Routing

- [Active architecture](../../HABITAT_ARCHITECTURE.md).
- [Active runtime realization](../../HABITAT_RUNTIME_REALIZATION.md).
- [System quarantine router](../AGENTS.md).
- [Documentation authority](../../../AGENTS.md).

## Validation

- Preserve both snapshot hashes and the quarantine-ledger marker.
- Keep active guidance pointed at canonical successors, not snapshot bodies.
- Any reused claim needs an explicit review verdict against current authority.
