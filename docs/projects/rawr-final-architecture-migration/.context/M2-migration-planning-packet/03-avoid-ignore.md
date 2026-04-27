# Avoid / Ignore

Status: ready for migration planning.
Scope: rough team-lead guardrails, not a complete cleanup inventory.

This is not the definitive list of documents to archive or delete. The broader documentation cleanup lane owns that detailed disposition work.

This file names the classes of input that should not steer migration planning.

## Avoid As Planning Authority

| Input Class | Why It Misleads |
| --- | --- |
| Old canonical architecture alternates, archived V1/V2 specs, and pre-final candidates | They reopen settled target decisions or average old terminology with final terminology. |
| Raw agent reports, scratch maps, extraction ledgers, review transcripts, and Claude/Opus outputs | They are evidence/provenance, not architecture truth. They can be mined only through accepted decision records. |
| Current repo package names, import paths, and bridge APIs as default architecture | Current repo reality is migration substrate. Preserving it by default recreates legacy gravity. |
| Quarantined migration plans, milestones, issue text, runbooks, finalization packets, or research packets | Useful history can turn into stale requirements if not reconciled first. Quarantine paths are provenance only. |
| Authentication and deployment companion specs as immediate runtime scope | They are useful look-ahead references, but they would expand M2 beyond the runtime substrate if treated as required implementation work. |
| Chat transcripts and uncurated project memory | They are too easy to overfit and too hard to validate. Use curated packets, accepted specs, and explicit decision records instead. |
| Raw broader cleanup artifacts before curation | The cleanup lane may contain draft findings, false positives, or intermediate classifications. Wait for the curated output. |

## Guardrail Phrases

During planning, these claims should trigger a check:

- "The repo already does it this way, so keep it."
- "This old spec says..."
- "The auth/deployment spec implies we should implement..."
- "We can leave the bridge and clean it up later."
- "This is just naming."
- "Diagnostics/cache/config/telemetry are details."

Each of those may be true in a narrow case, but none should pass without an owner, target authority pointer, and verification path.

## Why This Matters

The migration plan needs enough context to be executable, but too much unqualified context will make it incoherent.

The operating rule is:

```text
final specs define destination
repo audit defines starting material
secondary references define hooks and future lanes
everything else is provenance unless explicitly promoted
```
