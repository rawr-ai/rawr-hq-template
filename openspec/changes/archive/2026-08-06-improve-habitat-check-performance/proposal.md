## Why

Habitat's unchanged owner check is already a 0.54-second Nx cache hit, but some
compatibility rules hash acquisition-root descendants that the rule never
inspects. Unrelated edits therefore create false cold runs whose measured
baseline is 152.33 seconds.

## What Changes

- Make workspace-root compatibility-rule inputs represent exact rule coverage
  rather than every file in the workspace.
- Prove that unrelated files preserve cache identity while covered source,
  rule authority, and execution inputs invalidate it.
- Correct the stale execution-topology documentation.
- Investigate lockfile invalidation and true-cold Grit cost only as later,
  separately admitted slices with their own correctness and value gates.

## Capabilities

### New Capabilities

- `habitat-check-cache-precision`: Defines sound, minimal Nx cache inputs for
  Habitat owner and focused policy checks.

### Modified Capabilities

None.

## Impact

The first implementation slice is limited to the Habitat Nx projection,
projection behavior tests, and execution-topology documentation. Non-workspace
acquisition roots retain their current conservative inputs. The change does not
alter rule semantics, the owner-batched task graph, the Grit provider, Effect
composition, or the public CLI/SDK interface.
