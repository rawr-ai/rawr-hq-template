# Child Agent Completion Contract

This contract separates Hyperresearch service fan-in from Codex/RAWR child-session lifecycle behavior.

The current Hyperresearch service proof is file and ledger based: packet files are emitted, packet output files are reread from disk, artifact writes are hash-checked, source captures are ledgered, claim traces and patch logs are validated, and final `validate` gates acceptance. The stuck wait behavior observed in the runtime proofs did not break those service gates.

Clean child-session completion remains unclaimed until a focused Codex/RAWR diagnostic proves that child sessions reliably reach a final state and that the parent observes it after interruption or resume.

## Required Evidence

Every child-loop diagnostic must preserve a manifest with:

- parent thread/session id,
- child thread/session id,
- child role or diagnostic label,
- spawn item id when available,
- wait item id when available,
- close item id when available,
- expected output path,
- expected output SHA-256,
- observed child final state,
- observed parent wait result,
- observed parent close result,
- service fan-in status when the diagnostic is tied to Hyperresearch packets.

For this contract, clean child-completion success requires `Completed`.

Other terminal outcomes may be classified, but they do not prove clean child completion unless the diagnostic scenario explicitly expects them:

- `Errored`
- `Shutdown`
- `NotFound`

`Interrupted` is not clean completion. It is an intermediate or unresolved runtime state unless a later resume reaches `Completed` or a deliberately expected terminal outcome.

## Diagnostic Shape

Use a small `/tmp` `codex-rawr` repro before running another long Hyperresearch proof:

1. Parent spawns one child, waits, closes it, and records the manifest.
2. Parent spawns three children, waits for all, closes all, and records the manifest.
3. Parent repeats the multi-child case with an interruption/resume boundary.
4. Each child writes exactly one deterministic JSON file and then returns a final answer such as `DONE <child-id>`.

The point is to isolate Codex child lifecycle behavior from Hyperresearch research quality, source capture, or service artifact validation.

## Pass Criteria

- Parent event JSONL records spawn, wait, and close behavior for every child.
- Every child reaches `Completed`.
- Parent wait returns for every child, including after resume.
- Session JSONL, session resolution output, and manifest state agree.
- The child output files exist and match the recorded hashes.

## Fail Criteria

- A child writes the expected output but never emits a final state.
- A child reaches a final state but the parent wait misses it.
- Parent resume leaves an open child handle that cannot be closed or classified.
- `Interrupted` remains the terminal observed state.

## Hyperresearch Runtime Boundary

Missing Codex `SubagentStop`-style hooks are not a service defect and should not be papered over as hook parity. Hyperresearch runs rely on the packet output contract and final service validation for artifact integrity. Child lifecycle proof is a separate runtime ergonomics gate for parent wait/close behavior.

Service hardening that may follow this diagnostic:

- record completed packet output hashes on agent jobs;
- add attempt/replacement metadata if runtime evidence shows replacement linkage matters;
- add a transient/truncated packet-output test before deciding whether child writers must use temp-file plus rename semantics.
