---
name: skill-authoring
description: |
  This skill should be used when the user asks to create or refactor a SKILL.md, improve skill trigger quality, split content into references/assets, or validate a skill for production use in RAWR HQ.
---

<skill-usage-tracking>

# Skill Authoring (HQ)

Skills are model-invoked: good skills trigger reliably and provide a small, navigable operator manual that stays useful across repos.

## When to use

- Creating a new skill under `plugins/agents/*/skills/<skill>/`
- Refactoring a skill that is too long, too vague, or triggers incorrectly
- Adding `references/` and `assets/` so the main skill stays lean
- Reviewing a skill before shipping it as canonical guidance

## Outputs (definition of done)

- `SKILL.md` with frontmatter (`name`, `description`) that reliably triggers
- A lean `SKILL.md` body that is primarily navigational and procedural
- Optional `references/` for depth, variants, and troubleshooting
- Optional `assets/` for copy-forward templates (not documentation)
- Pass the validation gates in `references/validation-checklist.md`

## Working model (progressive disclosure)

1. Frontmatter: `name` + `description` (always in context)
2. `SKILL.md` body: default workflow + maps to deeper material
3. `references/*.md`: depth, variants, failure modes, checklists
4. `assets/*`: copy-forward templates and skeleton outputs

## Authoring workflow (recommended)

1. Clarify triggers with concrete examples (and near-misses).
2. Choose the minimal scope for this skill (one domain, one job-to-be-done).
3. Scaffold the folder (only add references/assets if they earn their keep).
4. Write `SKILL.md` as an operator manual:
   - purpose + boundaries
   - default workflow steps
   - maps to references/assets
5. Move depth out of `SKILL.md` into `references/` to prevent context bloat.
6. Run validation gates and tighten the trigger description.

## Reference map

| Reference | Path | Open when |
|---|---|---|
| Quality patterns | `references/quality-patterns.md` | You want scannable structure, invariants, and failure mode patterns |
| Progressive disclosure | `references/progressive-disclosure.md` | You are deciding what belongs in SKILL vs references vs assets |
| Validation checklist | `references/validation-checklist.md` | You want definition-of-done gates before shipping |

## Asset map

| Asset | Path | Use for |
|---|---|---|
| Skill template | `assets/skill-template.md` | Starting point for new skills (delete sections you do not need) |

## Core invariants

<invariants>
<invariant name="frontmatter-minimal">Frontmatter contains only `name` and `description`.</invariant>
<invariant name="trigger-specific">Descriptions include concrete trigger phrases; avoid generic "help" phrasing.</invariant>
<invariant name="skill-lean">Keep `SKILL.md` lean; push depth into `references/`.</invariant>
<invariant name="no-orphans">Every reference/asset is linked from `SKILL.md` (no orphan files).</invariant>
<invariant name="assets-copyable">Assets are meant to be copied into outputs, not loaded as docs.</invariant>
</invariants>

## Anti-patterns to avoid

- **Trigger soup**: broad keyword dump causes constant misfires.
- **Wall of text**: everything is in `SKILL.md`; nothing is navigable.
- **Orphan references**: deep docs exist but `SKILL.md` never links to them.
- **Duplicate truth**: copy/pasting canonical docs without a reason.
- **Templates as documentation**: heavy explanation in assets instead of references.

## Quick start

- Creating a new skill: start from `assets/skill-template.md`, then delete sections you do not need.
- Refactoring an existing skill: move depth into `references/` and keep `SKILL.md` navigational.

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: skill-authoring" with optional rationale. Omit if no skills invoked. -->

