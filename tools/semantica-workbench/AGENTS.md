# Semantica Workbench Router

## Scope

- Applies to the repository-local Python workbench in
  `tools/semantica-workbench/**`.

## Boundaries

- Owns the Python source and tests, pinned `uv` environment, reviewed ontology
  inputs, schemas, prompts, queries, fixtures, and viewer assets described by
  `pyproject.toml` and `README.md`.
- This is a Python 3.12 `uv` project, not an Nx project or a JavaScript
  workspace package. Do not invent Nx targets for it.
- Generated environments, runs, indexes, and reports belong under ignored
  `.semantica/**`; do not commit generated state beside the workbench source.
- Generated comparisons and model output are evidence and review aids. They do
  not promote ontology facts or become RAWR architecture authority.

## Flow

- Root setup and workbench CLI commands enter through `bin/workbench.mjs`.
- The wrapper selects the repository-local `uv` environment and invokes the
  Python CLI declared by `pyproject.toml`; `semantica:quality` runs Ruff,
  Pyright, and pytest directly through that same pinned `uv` environment.
- The CLI reads reviewed inputs and writes generated output beneath
  `.semantica/**`.

## Routing

- [Repository router](../../AGENTS.md)
- [Workbench overview](README.md)
- [Documentation router](../../docs/AGENTS.md)

## Validation

- `bun run semantica:check`
- `bun run semantica:quality`
