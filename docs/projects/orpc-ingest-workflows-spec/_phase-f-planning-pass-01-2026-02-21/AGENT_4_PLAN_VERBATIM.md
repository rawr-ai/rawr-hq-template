# AGENT 4 Plan Verbatim — Phase F Steward Review

## Role
P4 steward for independent planning-packet review of Phase F.

## Scope
Review planning artifacts only for:
1. invariant compliance,
2. overlap/collision risk,
3. hidden ambiguity,
4. blocking/high finding detection with concrete fix proposals.

## Required Introspection
1. /Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md
2. /Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md
3. /Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md
4. /Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md
5. /Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md

## Execution Method
1. Load the full required grounding corpus with line anchors.
2. Build an invariant matrix from ARCHITECTURE + DECISIONS against Phase F packet docs.
3. Check slice boundaries, dependencies, and file ownership for overlap/collision risk.
4. Check conditional decision semantics (F4/D-004) for ambiguity and drift risk.
5. Produce severity-ranked findings with file:line anchors.
6. Issue disposition: approve or changes-required.
