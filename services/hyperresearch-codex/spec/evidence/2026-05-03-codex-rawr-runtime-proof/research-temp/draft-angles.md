# Draft Angles

## I. Recommended Thesis Angle

The report should argue that Python packaging compatibility is layered, not monolithic. `pyproject.toml` controls source-tree build preparation and metadata production, core metadata controls installer resolution for built artifacts, and dependency groups intentionally remain a source-tree/tool workflow outside built package metadata.

## II. Installer Behavior Angle

The most useful practical framing is installer decision timing:

- Before a wheel exists, a frontend must understand `[build-system]` well enough to provision build requirements, select a backend, and surface malformed build tables as build-time errors.
- Once core metadata exists, installers should resolve from fields such as `Metadata-Version`, `Requires-Python`, `Requires-Dist`, `Provides-Extra`, and `Dynamic` instead of reinterpreting backend-specific source configuration.
- Dependency groups can improve standardized local workflows, but they do not create a portable distribution install contract because the specification excludes them from wheel and sdist package metadata and defines no standard install syntax.

## III. Claim-Trace Angle

Use standalone factual claims about specific compatibility boundaries:

- `project.dependencies` maps to `Requires-Dist`, while `project.optional-dependencies` maps to `Requires-Dist` entries associated with `Provides-Extra`.
- Metadata consumers should warn on unsupported newer minor metadata versions and fail on unsupported newer major metadata versions.
- Build backends must not include dependency group data in wheel `METADATA` or sdist `PKG-INFO` as package metadata.

## IV. Official Source Set

- https://packaging.python.org/en/latest/specifications/pyproject-toml/
- https://packaging.python.org/en/latest/specifications/core-metadata/
- https://packaging.python.org/en/latest/specifications/dependency-groups/
- https://packaging.python.org/en/latest/tutorials/packaging-projects/
