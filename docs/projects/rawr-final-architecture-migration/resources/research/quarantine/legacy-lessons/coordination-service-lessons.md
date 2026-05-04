# Coordination Archive Lessons

`coordination` is archived in Phase 1 because it stopped being useful as a live architectural future and started acting as false authority. This note preserves the narrow lessons that are still worth carrying forward after the live roots are gone.

## What To Preserve

### Boundary pattern

Keep the shape, not the package set:

- service truth -> plugin projection -> app composition -> host materialization

The useful lesson is that workflow semantics belonged downstream of a service-owned boundary and were only then projected into runtime/plugin surfaces. The failure was letting those downstream surfaces look canonical.

### Transport-neutral service contract

The coordination stack usefully demonstrated an `oRPC`-first service boundary around workflow operations such as list, save, get, and validate. That is worth preserving as a pattern: service-owned procedures can remain transport-neutral while host/runtime layers decide how they are exposed.

### Host-owned runtime injection

The workflow lane usefully showed that runtime materialization should be injected by the host/harness layer rather than authored as business truth. Queueing, trace propagation, ack/finished hooks, and similar execution concerns are real, but they belong below semantics.

## What To Leave Behind

- the `coordination` capability as a live architectural noun
- `.rawr/coordination` and its storage assumptions
- manifest and host registration authority for the archived lane
- workflow-engine logic presented as if it were canonical repo architecture
- any suggestion that Phase 1 should preserve dual composition or dual proof paths

## Reuse Rule

If a later async capability needs workflow-style behavior, start from the canonical architecture:

1. put semantic truth in the right service owner
2. project it through canonical plugin topology
3. let apps compose the resulting surfaces
4. let the host materialize runtime concerns

Do not restore `coordination` roots or copy their topology forward.
