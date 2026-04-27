# Quarantine-First Migration Docs Workflow

This runbook is the reusable workflow for documentation containment during major migrations.

Use it when a target architecture or runtime spec supersedes current docs and the repo contains mixed, stale, temporal, or authority-looking material. The goal is to keep active docs dependable while preserving old docs intact for mining.

## Core Rule

Repo topology is the risk-control surface.

- Outside `quarantine/`: active, dependable, verified, and safe to use as current guidance.
- Inside `quarantine/`: useful provenance or mining material, not active authority.
- Active routers may point to quarantine ledgers, but must not present quarantined docs as current guidance.

Do not make a mixed document safer by adding temporal migration notes inside it. Move the document intact into quarantine and explain how to use it from an external ledger.

## Authority Model

For M2 architecture migration work, the conflict winners are:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- the active migration plan once generated

Ontology, Semantica, semantic-diff, and claim-extraction outputs are evidence adapters. They help find candidate conflicts; they do not become architecture truth or verdicts by themselves.

Record unresolved ambiguity explicitly, especially:

- the exact canonical doc set for the current repo snapshot,
- the exact ontology or semantic comparison invocation,
- any doc whose active/quarantine status is unclear.

## Grounding

Before changing docs:

1. Check Graphite and Git state.
2. Confirm trunk and current branch.
3. Inspect staged and unstaged changes.
4. Use local dev CLI as `bun run rawr ...`; do not rely on PATH `rawr`.
5. If `bun run rawr sessions ...` is unavailable, extract transcript evidence directly from the session JSONL and record that tooling gap in the workstream notes.

Minimum commands:

```sh
git status --short --branch
gt trunk
bun run rawr --help
```

## Workflow

1. Inventory docs by topology and authority signal:
   - first-hop routers,
   - system docs,
   - specs and guardrails,
   - runbooks,
   - migration plans, milestones, and issues,
   - research and review packets,
   - archive and provenance material.

2. Compare claims against target authority:
   - extract authority language,
   - identify stale topology and temporal migration notes,
   - use ontology output where available to find noun, ownership, runtime-role, and service/plugin/app conflicts,
   - treat semantic findings as candidate conflicts requiring review.

3. Classify each doc:
   - `live`: active and not conflicting with target authority,
   - `quarantine`: preserved intact but removed from active authority,
   - `router-ledger`: active navigation surface that points to authority and quarantine,
   - `archive-only`: historical material not intended for day-to-day mining,
   - `open-question`: status cannot be resolved from current evidence.

4. Quarantine by topology:
   - move contaminated docs intact into the nearest appropriate `quarantine/` directory,
   - do not rewrite quarantined document bodies,
   - avoid same-path stubs unless the path is a true router that must remain as a safe landing page,
   - update active routers so they route to final specs and quarantine ledgers.

5. Write transient ledgers:
   - add an `AGENTS.md` beside each meaningful quarantine directory,
   - start each ledger with `<!-- quarantine-ledger: true -->`,
   - mark it as a transient migration ledger,
   - list useful quarantined material and how to mine it safely.

Ledger entries should include:

```md
| Quarantined path | Original role | Why quarantined | Still useful for | Conflict rule | Promotion condition |
| --- | --- | --- | --- | --- | --- |
```

6. Review and promote:
   - promotion means moving a document back out of quarantine only after its ledger graduation condition is met,
   - promotion requires evidence and an explicit review verdict,
   - if a doc fails promotion review, keep it quarantined and update the ledger rather than patching the doc body.

## Review Graph

Use these review loops before declaring the doc surface safe:

| Loop | Question | Evidence |
| --- | --- | --- |
| Topology | Is quarantine obvious from paths? | `find docs -path '*/quarantine/*' -name '*.md' | sort` |
| Ledger | Does each useful quarantine directory have a transient ledger? | `rg -n "quarantine-ledger: true" docs --glob 'AGENTS.md'` |
| Authority | Do active docs defer to final specs and migration plan? | active-doc scans and router spot checks |
| Semantic comparison | Were candidate conflicts classified? | ontology/semantic reports or manual claim matrix |
| Active cleanliness | Are temporal migration notes absent from live system/spec docs? | stale-term scans excluding quarantine/archive |
| Promotion | Has any unquarantine move passed evidence-backed review? | review verdict plus satisfied promotion condition |

Minimum verification:

```sh
git diff --check
find docs -path '*/quarantine/*' -name '*.md' | sort
rg -n "quarantine-ledger: true" docs --glob 'AGENTS.md'
rg -n "during migration|pending post-migration|regenerate|if it conflicts" docs \
  --glob '*.md' \
  --glob '!**/quarantine/**' \
  --glob '!**/_archive/**'
```

Remaining hits in active docs must be explicit router/ledger language or reviewed false positives.

## Promotion Defaults

- Testing plans graduate before migration proof planning depends on them.
- Telemetry docs graduate before live telemetry or proof-lane work depends on them.
- Runbooks graduate before agents rely on those operational commands.
- Research packets usually do not graduate directly; mine them into new system/process docs if still relevant.

## Failure Modes

- A canonical-looking doc outside quarantine carries stale target claims.
- A useful runbook is overwritten from architecture specs instead of preserved intact.
- An active router points directly to quarantined material without warning.
- Semantic extraction is treated as architecture truth instead of candidate evidence.
- Quarantine exists only in prose, not in paths or scriptable ledgers.

If any failure appears, repair the topology and ledger first. Rewrite content only during promotion or active-router maintenance.
