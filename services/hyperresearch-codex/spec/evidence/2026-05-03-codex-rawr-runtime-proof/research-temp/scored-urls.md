# Scored URLs: Python Packaging Metadata and Installer Compatibility

Rubric: authority, relevance, specificity, and installer-behavior signal, each scored 0-5 for a total of 20. All selected URLs are official Python Packaging Authority documentation.

| Score | URL | Verdict | Why it matters for downstream synthesis |
| ---: | --- | --- | --- |
| 20 | `https://packaging.python.org/en/latest/specifications/pyproject-toml/` | Primary | Primary specification for `pyproject.toml`. It defines `[build-system]` build requirements, default/error behavior around missing build-system data, `[project]` as core metadata, and the mapping from `dependencies`/`optional-dependencies` to `Requires-Dist`/`Provides-Extra`. |
| 20 | `https://packaging.python.org/en/latest/specifications/core-metadata/` | Primary | Primary installer-facing metadata contract. It covers `Metadata-Version` compatibility rules, `Requires-Dist` dependency entries, `Requires-Python` candidate filtering, `Provides-Extra` optional feature behavior, `Dynamic` semantics for sdists and wheels, and newer metadata fields that can affect tool compatibility. |
| 19 | `https://packaging.python.org/en/latest/specifications/dependency-groups/` | Primary | Primary source for dependency groups. It states that dependency groups are stored in `pyproject.toml`, are intended for development/local use cases, are not included in built package metadata, have no specification-defined install interface, and should be handled through tool-specific commands or UX. |
| 16 | `https://packaging.python.org/en/latest/tutorials/packaging-projects/` | Supporting official context | Official tutorial that connects the specs to practical build flow. It explains that `pyproject.toml` tells build frontends such as `pip` and `build` which backend to use, that frontends should install `build-system.requires` automatically, and that builds commonly happen in isolated environments before producing wheel and sdist artifacts. |

## Priority Order

1. Capture `pyproject.toml` and core metadata first, because these define the portable source-to-distribution metadata path that installers can rely on.
2. Capture dependency groups next, because the key compatibility implication is mostly negative: they are useful standardized local requirement groups, but they are not portable built-distribution metadata and do not define a cross-installer installation syntax.
3. Use the tutorial last as explanatory bridge material, not as the controlling specification.

## Downstream Claim Targets

- Build-time compatibility: frontends use `[build-system]` to provision backend requirements and choose the build backend before producing installable artifacts.
- Metadata compatibility: installers consume core metadata fields to filter candidates, parse dependencies, activate extras, and decide whether metadata is too new to process safely.
- Dependency-group compatibility: tools may support dependency groups, but behavior is not portable through wheel metadata and is not equivalent to extras.
