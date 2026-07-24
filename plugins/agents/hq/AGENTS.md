# HQ Agent Plugin Router

## Scope

- Applies to `plugins/agents/hq/**`; inherit the
  [plugin package router](../../AGENTS.md).
- This package contains HQ agent-plugin source: skills, agents, workflows,
  authoring assets, references, and package-local scripts.

## Boundaries

- Skills own concise entrypoints and route deeper guidance to `references/` or
  `assets/`; agents and workflows consume those authoring surfaces without
  duplicating their doctrine.
- Content files are source, not executable lifecycle authority. Editing this
  package does not install, release, enable, or remove provider plugins.
- A skill, agent, or workflow has no distribution identity independent of this
  parent plugin.
- Do not run `scripts/publish.sh` as validation: it is an explicit external
  repository mutation helper, not a source-quality check.

## Flow

- Authors change package-owned content, review its frontmatter, links, and
  progressive disclosure, then validate the package. Any later release or
  provider convergence begins through the separately governed agent-plugin
  lifecycle.

## Routing

- [Plugin package boundaries](../../AGENTS.md)
- [Agent authoring skill](skills/agent-authoring/SKILL.md)
- [Skill authoring skill](skills/skill-authoring/SKILL.md)
- [Agent-plugin lifecycle workflow](workflows/lifecycle-agent-plugin.md)

## Validation

- Run `bunx nx run habitat:lint`.
- Review changed Markdown frontmatter and repository-relative links before
  treating the content slice as complete.
