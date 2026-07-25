# ChatGPT Corpus Source Materials Module Router

## Purpose

- Convert raw conversation exports and supporting Markdown into one normalized
  source snapshot for corpus derivation.

## Scope

- Applies to source discovery, parsing, normalization, and snapshot behavior
  in this module directory.

## Boundaries

- Source materials owns input validity and stable source identity, not the
  derived family graph, artifact layout, or workspace scaffold.
- Reads cross only through the workspace-store capability.

## Behavior

- The module discovers admitted source files, parses ChatGPT export shapes,
  preserves distinct identities even when basenames collide, and returns
  normalized counts and content or typed input failures.

## Concepts

- A **source snapshot** is the complete normalized input observation.
  **Conversation sources** and **Markdown sources** retain distinct identities;
  **source counts** summarize the admitted set.

## Flow

- A snapshot request reads the bound workspace, validates each discovered
  source, normalizes records in deterministic order, and returns one snapshot
  to artifact construction.

## Interfaces

- `readSnapshot` is the caller boundary. The workspace store supplies reads;
  invalid JSON and invalid conversation export shapes return as declared
  service failures.

## Routing

- [ChatGPT Corpus service router](../../../../AGENTS.md)
- [Workspace module](../workspace/AGENTS.md)
- [Corpus-artifact module](../corpus-artifacts/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/chatgpt-corpus:test` for normalized snapshots,
  duplicate basenames, malformed JSON, and invalid export shapes.
