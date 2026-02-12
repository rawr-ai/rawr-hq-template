<!--
SKILL TEMPLATE (HQ)
Copy this file when creating a new skill, then delete sections you do not need.

Principles:
- Frontmatter: name + description only
- SKILL.md: operator manual + navigation
- references/: depth, variants, patterns, troubleshooting
- assets/: copy-forward templates (minimal explanation)
-->

---
name: <skill-name>
description: |
  This skill should be used when the user asks to "<trigger 1>", "<trigger 2>", "<trigger 3>", or needs <specific outcome>.
---

# <Skill Title>

## Purpose
<!-- 2-4 sentences: what this skill enables, for whom, and why it exists. -->

## When to use
<!-- Concrete triggers + situations. -->

## Non-goals / boundaries
<!-- What this skill should not be used for. -->

## Default workflow
1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

## Reference map
| Reference | Path | Open when |
|---|---|---|
| <!-- Patterns --> | `references/<file>.md` | <!-- You need ... --> |
| <!-- Checklist --> | `references/<file>.md` | <!-- Before shipping --> |

## Asset map (optional)
| Asset | Path | Use for |
|---|---|---|
| <!-- Template --> | `assets/<file>.md` | <!-- Copy into output --> |

## Core invariants (optional)
<invariants>
<invariant name="example">A named rule worth enforcing in review.</invariant>
</invariants>

## Anti-patterns to avoid
- <!-- Name: brief description -->

## Failure modes (symptom -> fix)
- **Symptom**: <!-- what you observe -->
  Fix: <!-- what to change -->

## Quick start
<!-- 3-6 lines: fastest path for the most common request. -->

