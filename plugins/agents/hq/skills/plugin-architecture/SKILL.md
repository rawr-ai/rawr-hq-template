---
name: plugin-architecture
description: |
  This skill should be used when designing or restructuring RAWR plugins: choosing plugin kind (toolkit vs agent vs web), keeping reporter vs actor boundaries crisp, laying out plugin directories/manifests, and designing settings and publishing flows.
---

<skill-usage-tracking>

# Plugin Architecture (RAWR HQ)

This skill is the "where does it go?" and "what owns what?" guide for the RAWR plugin ecosystem.

## Quick decisions

### Which plugin kind?

- `rawr.kind=toolkit` (`plugins/cli/*`): reporter commands (stateless, mechanical)
- `rawr.kind=agent` (`plugins/agents/*`): Claude Code runtime artifacts (skills, workflows, agents, hooks), plus optional actor commands
- `rawr.kind=web` (`plugins/web/*`): runtime/web exports (separate concern)

### Reporter vs actor

- Reporter: input in, output out. No domain judgment.
- Actor: composes reporters plus judgment; often triggers durable orchestration.

## Reference map

| Reference | Path | Open when |
|---|---|---|
| Manifest reference | `references/manifest-reference.md` | You need concrete fields and layout rules |
| Publishing | `references/publishing.md` | You are shaping a publish pipeline or distribution contract |
| Settings pattern | `references/settings-pattern.md` | You need per-project `.claude/*.local.md` settings |
| Channel model | `references/channel-model.md` | You are deciding between reporters/actors and layers |

## Core invariants

<invariants>
<invariant name="capabilities-follow-deploy-target">Claude runtime artifacts live in agent plugins; oclif reporters live in toolkits.</invariant>
<invariant name="logic-in-packages">Keep engines in `packages/`; keep plugin entry points thin.</invariant>
<invariant name="do-not-mix-surfaces">Do not mix command surfaces in examples: `rawr plugins ...` vs `rawr plugins web ...`.</invariant>
</invariants>

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: plugin-architecture" with optional rationale. Omit if no skills invoked. -->

