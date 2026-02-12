# Skill Validation Checklist (Definition of Done)

Run this checklist before considering a skill production-ready.

## Frontmatter and triggering

- [ ] Frontmatter contains only `name` and `description`.
- [ ] `description` includes 5-12 concrete trigger phrases (what users actually say).
- [ ] Avoid vague triggers ("help", "stuff", "work with").
- [ ] If the skill is easy to confuse with another, document a boundary ("do not use when ...").

## SKILL.md body (operator manual)

- [ ] Purpose and boundaries are explicit.
- [ ] Default workflow is ordered and actionable (not prose-only).
- [ ] `SKILL.md` is navigational, not encyclopedic.
- [ ] Reference/asset maps exist and are accurate.

## Progressive disclosure

- [ ] Deep detail lives in `references/` (not in `SKILL.md`).
- [ ] No orphan references/assets (everything is linked from `SKILL.md`).
- [ ] Assets are copy-ready without hidden context.

## Failure modes and safety

- [ ] At least one failure mode is documented (symptom -> fix).
- [ ] High-risk ambiguity requires an explicit "ask and stop" rule.

## Regression guard (for refactors)

- [ ] Important content was moved, not silently dropped.
- [ ] Paths referenced in docs exist and are correct.

