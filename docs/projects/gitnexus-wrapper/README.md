# GitNexus-Style Wrapper On Top Of Narsil

## Status

Parked future-facing proposal. This is not active implementation work for `RAWR HQ-Template`.

## Why Keep This Note

`narsil-mcp` is the better primary code-intel server for this repo, but GitNexus still represents a useful interaction model:

- `query`
- `context`
- `impact`
- maybe `detect_changes`

This project note preserves the clean composition idea without keeping GitNexus itself in the template baseline.

## Recommendation

Build a small wrapper or proxy on top of Narsil first, not a Rust-core implementation.

Why:

- Narsil already has the lower-level primitives.
- The GitNexus value is mostly workflow abstraction and output shaping.
- A wrapper is faster to iterate on and easier to discard or replace.
- Moving too early into the Rust server would hard-code one opinionated UX into the core engine.

## Proposed Tool Mapping

### `query`

Compose:

- `hybrid_search`
- `find_symbols`
- `get_excerpt`

Optionally enrich with:

- `get_call_graph`
- `get_import_graph`

### `context`

Compose:

- `get_symbol_definition`
- `find_references`
- `find_symbol_usages`

Optionally enrich with:

- `get_callers`
- `get_callees`
- `get_excerpt`

### `impact`

Compose:

- `find_references`
- `get_callers`
- `find_call_path`
- `get_import_graph`

This is mostly ranking and blast-radius shaping over primitives Narsil already exposes.

### `detect_changes`

Compose:

- `get_modified_files`
- symbol extraction over changed files
- `find_references`
- `get_callers`

This is an orchestration problem more than a parser problem.

### `rename`

Do not treat this as a first wrapper target.

Safe rename is a different class of feature:

- coordinated edits
- confidence handling
- text fallback
- possible AST rewrite support

If it ever happens, it should happen after the read-only workflow tools are stable.

## Delivery Shape

Preferred order:

1. Add `rawr-hq-template` as a dedicated Narsil instance.
2. Use Narsil as the primary intelligence engine.
3. Build a thin workflow wrapper with GitNexus-style commands.
4. Only move pieces into the Rust server if the wrapper stabilizes and there is a clear performance or product reason.

## Rough Effort

- `query` + `context`: easy to moderate
- `impact`: moderate
- `detect_changes`: moderate to somewhat hard
- Narsil-native `rename`: hard and likely the wrong first target
