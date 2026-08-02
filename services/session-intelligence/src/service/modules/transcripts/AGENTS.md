# Session Transcripts Module Router

## Purpose

- Detect supported session formats and extract provider-native records into a
  normalized transcript.

## Scope

- Applies to transcript format detection and message extraction in this module
  directory.

## Boundaries

- Transcripts owns provider record interpretation, role and tool filtering,
  deduplication, slicing, and normalized message shape.
- It does not discover session catalogs, rank search results, or maintain
  indexes. Raw reads remain behind the session-source runtime.

## Behavior

- The module detects Codex, Claude, or unknown format and extracts a bounded
  message sequence with stable session metadata, optional tool content,
  deduplication, offset, and maximum-message controls.

## Concepts

- A **session format** is the provider-native record grammar. A **normalized
  message** preserves role and selected content; an **extracted session**
  combines those messages with stable source and session metadata.

## Flow

- Detect examines a path through the source runtime. Extract selects the
  parser, normalizes and filters records, applies dedupe and slicing, and
  returns the transcript or an unknown-format failure.

## Interfaces

- `detect` and `extract` are caller operations. The session-source runtime
  supplies bounded record access; normalized session entities are the output
  boundary.

## Routing

- [Session Intelligence service router](../../../../AGENTS.md)
- [Session catalog module](../catalog/AGENTS.md)
- [Search module](../search/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-session-intelligence:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-session-intelligence:test` for Codex and Claude
  detection, normalized messages, slicing, dedupe, roles, tools, and unknown
  formats.
