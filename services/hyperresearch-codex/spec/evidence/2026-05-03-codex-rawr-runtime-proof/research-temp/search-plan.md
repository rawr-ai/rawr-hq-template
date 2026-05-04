# Search Plan: Python Packaging Metadata and Installer Compatibility

Canonical query: What are the practical compatibility implications of Python's packaging metadata standards for modern Python project installers, focusing on `pyproject.toml`, core metadata, and dependency groups?

## Source Constraint

Use only official Python Packaging Authority or official Python documentation sources. Do not use blogs, issue threads, Stack Overflow, vendor package-manager docs, or non-official summaries. The packet-provided PyPA URLs are sufficient for the width sweep and should be treated as the source queue.

## Official Source Queue

- `https://packaging.python.org/en/latest/specifications/pyproject-toml/`
- `https://packaging.python.org/en/latest/specifications/core-metadata/`
- `https://packaging.python.org/en/latest/specifications/dependency-groups/`
- `https://packaging.python.org/en/latest/tutorials/packaging-projects/`

## Extraction Plan

1. `pyproject.toml` specification: extract how `[build-system]` affects build frontends and installers before installation, including `requires`, default semantics when the table is absent, and error behavior when required fields are missing. Extract how `[project]` maps source-declared metadata into core metadata, especially `requires-python`, `dependencies`, and `optional-dependencies`.
2. Core metadata specification: extract installer-facing compatibility fields. Prioritize `Metadata-Version`, `Requires-Dist`, `Requires-Python`, `Provides-Extra`, and `Dynamic`, because these control metadata parser compatibility, candidate selection, dependency resolution, extras, and sdist-to-wheel metadata expectations.
3. Dependency Groups specification: extract the distinction between development/local dependency groups and package distribution metadata. Prioritize the facts that dependency groups live in `pyproject.toml`, are not included in built package metadata, have no specification-defined install syntax, and require tool-specific interfaces.
4. Packaging tutorial: use only as practical context for the spec behavior. Extract that modern build frontends read `pyproject.toml`, install `build-system.requires` automatically during builds, usually build in isolated environments, and produce wheel/sdist artifacts that installers consume.

## Working Compatibility Hypotheses

- `pyproject.toml` is pre-install/build-time configuration for modern frontends: it tells tools which backend to use and which build requirements must be available. Compatibility failures often appear before dependency resolution if build requirements or backend declarations are missing, unsupported, or too new.
- Core metadata is the built-distribution compatibility API. Installers can make behavior decisions from wheel or sdist metadata without understanding every backend-specific `pyproject.toml` detail.
- `Requires-Python`, `Requires-Dist`, and `Provides-Extra` are the main practical installer levers for Python-version filtering, dependency graph construction, and optional feature installation.
- `Metadata-Version` creates parser compatibility obligations: consumers should warn on unsupported minor versions and must fail on unsupported major versions, while build tools may emit the lowest metadata version that contains the needed fields for broader compatibility.
- Dependency groups should not be treated as extras. They are standardized development/local requirement groups, not built package metadata, and any installer UX for them is a tool-specific interface rather than a portable distribution contract.

## Exclusion Rules

- Do not generalize pip-specific behavior unless it is stated by the official PyPA docs.
- Do not treat dependency groups as dependency metadata in wheels or sdists.
- Do not cite PEPs directly unless a downstream step explicitly expands the official-source set; this width sweep is constrained to PyPA/official Python documentation URLs.
