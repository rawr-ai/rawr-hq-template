# HQ Agent Plugin Router

## Purpose

- Author the HQ plugin's reusable skills, specialist agents, workflows, and
  supporting content as one curated distribution unit.

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

## Behavior

- Authors evolve provider-neutral content and its internal references; a
  separate governed lifecycle later packages, releases, and converges that
  content into native providers.

## Concepts

- The **agent plugin** is the distribution identity. A **skill entrypoint**
  triggers and routes to progressive detail; agents and workflows orchestrate
  those authored capabilities without acquiring their own release identity.

## Flow

- Authors change package-owned content, review its frontmatter, links, and
  progressive disclosure, then validate the package. Any later release or
  provider convergence begins through the separately governed agent-plugin
  lifecycle.

## Interfaces

- Markdown frontmatter and repository-relative references are the authoring
  interface; the agent-plugin lifecycle is the only handoff from source
  content to package and provider state.

## Routing

- [Plugin package boundaries](../../AGENTS.md)
- [Agent authoring skill](skills/agent-authoring/SKILL.md)
- [Skill authoring skill](skills/skill-authoring/SKILL.md)
- [Agent-plugin lifecycle workflow](workflows/lifecycle-agent-plugin.md)

## Validation

- Run `bunx nx run habitat:lint`.
- Review changed Markdown frontmatter and repository-relative links before
  treating the content slice as complete.
