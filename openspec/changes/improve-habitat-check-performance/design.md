## Context

The installed Habitat `0.5.1` owner check evaluated 33 applications in 152.33
seconds from a cold Nx cache and repeated in 0.54 seconds with a 100% cache hit.
The warm result bounds Nx startup, graph construction, hashing, cache lookup, and
replay to a negligible part of the cold result. The immediate defect is not a
missing cache: compatibility projection adds exact coverage patterns and then
also recursively hashes every acquisition-root descendant. Three active rules
acquire the workspace root, so an unrelated tracked edit makes their owners
cold even when no inspected subject changed.

Runtime evaluation first admits each acquisition root and then intersects exact
coverage matches with those roots. Cache inputs can represent that same
narrowing without changing rule behavior. True-cold execution remains a
different concern: the provider deliberately runs each Grit program in its own
native process so timeout, output, attribution, failure, cancellation, and
cleanup remain program-local.

## Goals / Non-Goals

**Goals:**

- Remove the recursive workspace input when a compatibility rule acquires the
  Nx workspace root and already declares its inspected coverage.
- Preserve a cache hit for edits outside a rule's inspected corpus.
- Preserve invalidation for covered source, rule assets, catalog authority,
  and runtime inputs.
- Keep one cacheable owner command whose inputs are the ordered union of its
  focused policy inputs.

**Non-Goals:**

- Redesigning the owner-batched Nx topology or scheduling focused leaves.
- Changing Habitat rule semantics, the public CLI/SDK contract, or consumer
  policy.
- Restoring multi-pattern Grit execution, adding a daemon, or weakening
  per-program isolation.
- Replacing Grit with Biome, rewriting Effect composition, or creating a Rust
  engine.
- Changing lockfile inputs or promising a lower true-cold duration in this
  slice.

## Decisions

### Treat the Nx workspace root as a host fact

Compatibility inputs retain catalog and rule authority, local runner assets,
every declared coverage pattern, and runtime inputs. When a Grit acquisition
entry is the directory `.` itself, projection will not add
`{workspaceRoot}/**/*`: Nx has already established the live workspace in which
the target runs, while the rule's coverage declares the files it can inspect.
The Nx workspace-root override environment remains a runtime input so an
explicit host-root change cannot reuse the prior result.

Non-workspace acquisition roots retain their current conservative recursive
inputs in this slice. Nx filesets do not encode directory admission state, and
adding a filesystem fingerprint helper would create another cache model merely
to broaden this optimization. This cut solves the measured workspace-wide
invalidation without that machinery.

### Keep owner batching

The current owner target resolves the catalog once and executes one selected
Habitat check. Focused targets remain diagnostic faces, not dependencies.
Ordinary leaf fanout would repeat CLI and catalog construction and make a full
cold run worse. Owner inputs therefore remain the deterministic union of their
focused inputs.

### Separate invalidation from engine cost

The raw `bun.lock` input and the 23-process Grit cold path remain measured
follow-ups, not hidden parts of this implementation. Lockfile narrowing requires
an exact installed CLI/SDK/tool closure fingerprint. Grit batching requires a
discriminating proof that preserves every program-local lifecycle guarantee.
Neither follows from the coverage-input defect.

### Retain the native vendors

Nx remains the task, hash, cache, and scheduling owner. Grit remains the source
law engine because the active catalog includes Markdown and foreign JavaScript
patterns that Biome does not execute. Effect remains the resource and process
lifecycle substrate; no profile attributes material cost to it. A custom Rust
crate would duplicate native Grit without a stable library boundary and is not
admitted.

## Risks / Trade-offs

- **Narrow inputs omit a negative-result dependency** -> cover unrelated,
  covered, added, changed, and deleted files with projection and native Nx
  cache tests before landing.
- **Cold checks remain slow after false misses are removed** -> record the
  improvement as cache precision only and profile the native process path in a
  separate change.
