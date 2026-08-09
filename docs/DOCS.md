# DOCS

This file is the documentation architecture contract for the Habitat platform
repository. Its remote/directory may retain the legacy `RAWR HQ-Template`
locator until repository rename; that locator transfers no platform authority
to Rawr.

## Gateway Docs

Canonical gateway docs at `docs/` root:
- `PRODUCT.md`
- `PROCESS.md`
- `ROADMAP.md`
- `DOCS.md`

Current Habitat system authority is scoped, not duplicated:

- `docs/system/HABITAT_ARCHITECTURE.md` owns platform architecture, product
  boundaries, layers, kinds, and distribution authority.
- `docs/system/HABITAT_RUNTIME_REALIZATION.md` owns runtime realization
  mechanics, artifact handoffs, execution, and settlement.

Archived architecture-migration records under
`docs/projects/_archive/rawr-final-architecture-migration` are provenance only,
not current platform authority.

The previous `docs/SYSTEM.md` is preserved at `docs/quarantine/SYSTEM.md` and is not active system authority.

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
- `docs/_templates/`: document scaffolds owned by the Habitat repository.
- `docs/_archive/`: archived historical docs not part of active Habitat platform guidance.
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
- Platform: `Habitat`.
- First downstream product: `Rawr`.
- Curated agent-plugin repository: `Marketplace`.
- `RAWR HQ-Template` and `RAWR HQ` are legacy repository locators pending
  their separate rename operations, not product-authority names.
