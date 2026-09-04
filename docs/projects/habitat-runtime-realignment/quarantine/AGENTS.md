<!-- quarantine-ledger: true -->
# Realignment Quarantine Ledger

This is a transient migration ledger, not runtime or execution authority.
All descendant original document bodies are preserved intact and must not be
edited. Their imperative wording, task states and source inventories are
historical evidence only. Current same-path successors in active topology win.

Baseline source commit: `374149800a067e527342e334ff6a3022fbd38cd7`.
Initial preservation verified byte equality with `git show <baseline>:<source>`;
the verification record must repeat that check before admission.

| Quarantined Material | Original Role | Why Quarantined | Useful For | Conflict Rule | Promotion Condition |
| --- | --- | --- | --- | --- | --- |
| `openspec-baseline/**` | Active runtime change, receipts embedded in prose, source/stack accounting, capability deltas | Current semantics and historical activation/corpus rules were inseparable | Exact inherited obligations, failed qualifications, source lineage and prior review evidence | Active canonical semantics and clean OpenSpec successors win; no old sole-active sentence authorizes work | Mine specific behavior into an independently reviewed active owner; never promote the mixed body wholesale |
| `roadmap-baseline.md` | Repository roadmap | It still described completed initial separation as future work | Prior initiative scope and deferred intent | Current `docs/ROADMAP.md` wins | Promote only still-relevant outcomes with current ownership and evidence |

The [OpenSpec snapshot ledger](openspec-baseline/AGENTS.md) records every source
blob, including both nested capability specs. The architecture/runtime originals
have their own [system quarantine ledger](../../../system/quarantine/runtime-realignment-2026-09-04/AGENTS.md).
The old frozen Rawr migration archive and existing JSON receipt files are
unchanged, not relocated into this subtree.

Roadmap source: `docs/ROADMAP.md`.
Roadmap Git blob: `b40313fb6ea37f15d91ae60efe44b5711ee22945`.
Roadmap SHA-256: `319f59e76d21dda19039970e96fc56cef39a35a683aebf348f5ede086319b725`.

This ledger grants no authority to restore rejected source, change a receipt,
publish an artifact, or delete another owner's worktree.
