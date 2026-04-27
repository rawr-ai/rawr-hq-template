# DOCS

This file is the documentation architecture contract for `RAWR HQ-Template`.

## Gateway Docs

Canonical gateway docs at `docs/` root:
- `PRODUCT.md`
- `PROCESS.md`
- `ROADMAP.md`
- `DOCS.md`

Current architecture authority for M2 migration planning lives in:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/`

The previous `docs/SYSTEM.md` is preserved at `docs/quarantine/SYSTEM.md` pending a post-migration rewrite.

## Directory Roles

- `docs/product/`: product scope and user-facing semantics.
- `docs/system/`: architecture and technical contracts.
- `docs/process/`: workflows, contribution, and operating playbooks.
- `docs/projects/`: time-bound initiative docs.
- `docs/projects/<project>/resources/spec/`: project-scoped normative specs and guardrails.
- `docs/projects/<project>/resources/research/`: supporting research and investigation notes.
- `docs/projects/<project>/milestones/`: active milestone definitions.
- `docs/projects/<project>/issues/`: project-scoped issue specs.
- `docs/projects/<project>/.context/`: active execution packets, scratchpads, handoffs, and hot context for the project.
- `docs/projects/spikes/`: retained spike investigations and feasibility notes. Promote lasting decisions into `docs/system/`, `docs/process/`, or the owning project `resources/spec/`.
- `docs/_templates/`: document scaffolds.
- `docs/_archive/`: archived historical docs not part of active template guidance.
- `quarantine/` directories: path-obvious quarantine for docs preserved intact but removed from active authority.
- `quarantine/AGENTS.md`: transient migration ledgers marked with `<!-- quarantine-ledger: true -->`.

## Canonicality Rules

- ALL-CAPS files are canonical at their scope.
- Prefer links to canonical docs over duplicating guidance.
- Time-bound execution notes belong in `docs/projects/` or `docs/_archive/`, not canonical docs.
- Files under any `quarantine/` directory are not active authority, even if their names look canonical.
- Quarantine-first migration sweeps use `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`.

## Authority and Intent Vocabulary

Use these words precisely. They describe different axes:

- **Normative**: this document **defines requirements** (rules). It answers “what MUST/SHOULD/MUST NOT be true?”
  - Normative docs SHOULD use explicit requirement language (`MUST`, `SHOULD`, `MUST NOT`) when setting policy.
- **Informative / descriptive**: this document **describes reality or context**. It answers “what is true (today), why, or how does it work?”
  - Informative docs MUST NOT silently introduce requirements. If a rule is intended, it must be made normative.
- **Canonical**: this document is the **source of truth / authority** for its scope. It answers “which doc wins if two docs disagree?”
  - Canonical is **not** the opposite of normative. Canonical is about authority; normative is about intent.
  - A document can be canonical + normative (policy/spec), canonical + informative (authoritative reference), or non-canonical (notes/examples).

### Recommended opening lines

Docs SHOULD state their intent early, for example:

- “This document is **normative**.” (policy/spec)
- “This document is **informative**.” (reference/explanation)
- “This document is **canonical** for X.” (authority statement)

## Naming Rules

Use these names consistently:
- Template repo: `RAWR HQ-Template`
- Personal repo: `RAWR HQ`
