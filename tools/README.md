# Repository Tools

This directory contains repository-local tooling that supports RAWR HQ-Template development and migration work.

## Tool Semantics

- `tools/semantica-workbench/` is the architecture-intelligence workbench for Semantica-backed document extraction, ontology formation, semantic diffing, and report generation.
- `tools/nx/` contains Nx generator support.
- `tools/architecture-inventory/` contains curated architecture inventory data.

Generated tool state belongs in ignored repo-local directories such as `.semantica/`, not in sibling repositories.
