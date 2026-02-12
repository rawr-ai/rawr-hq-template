# Skill Quality Patterns (HQ)

Use these patterns when a skill is meant to be canonical, reusable, and safe to apply in unfamiliar repos.

## Navigation patterns

### Reference maps as tables

Tables are more scannable than long lists, and the "Open when" column reduces wasted clicks.

### One-hop rule

`SKILL.md` should link directly to references/assets. Avoid deep chains like `SKILL.md -> references/a -> references/b`.

## Structure patterns

### Named invariants

Use `<invariants>` to capture rules worth enforcing during review.

### Failure modes (symptom -> fix)

Prefer operational troubleshooting:

- **Symptom**: what a user/agent will observe
  Fix: what to change

## Content patterns

### Grounding section

If the skill will be used in multiple repos, include a small "Grounding" section:

- typical entrypoints to inspect
- files that are often relevant
- common naming conventions

### Anti-patterns with names

Give failures a short name so they can be referenced in review:

- "trigger soup"
- "orphan references"
- "wall of text"

## Style patterns

- Prefer short sections and links over exhaustive inline explanation.
- Prefer steps and checklists over prose-only guidance.
- Keep examples minimal in `SKILL.md`; move the long examples to `references/`.

