# Practical Compatibility Implications of Python Packaging Metadata Standards

## I. Executive Summary

Modern Python installers have to treat packaging metadata as three different compatibility contracts. `pyproject.toml` is the source-tree and build contract: it tells build frontends which build requirements and backend are needed before an installable artifact exists. Core metadata is the distribution contract: installers use it to decide whether a candidate can be parsed, whether it supports the running Python, which dependencies and extras to add, and how much to trust metadata from a selected artifact. Dependency groups are the local workflow contract: they standardize named requirement lists in `pyproject.toml`, but they are deliberately not built package metadata and do not define a portable install syntax. [pyproject] [core-metadata] [dependency-groups] [packaging-tutorial]

The practical result is that a compatible installer cannot collapse all of these into one model. It needs pyproject-aware source builds, core-metadata-driven resolution, and a separate tool-specific interface if it supports dependency groups.

## II. Material Claims For Trace

For source builds, the PyPA `pyproject.toml` specification says tools should use default setuptools semantics when `pyproject.toml` or `[build-system]` is absent, but should treat a present `[build-system]` table with missing required fields as an error. [pyproject]

`project.dependencies` in `pyproject.toml` maps directly to core metadata `Requires-Dist`, and `project.optional-dependencies` maps to `Requires-Dist` entries associated with `Provides-Extra`. [pyproject]

Core metadata consumers should warn when `Metadata-Version` is newer than they support and must fail when the unsupported version has a greater major version than they support. [core-metadata]

Build backends must not include dependency group data in built distributions as package metadata, so wheel `METADATA` and sdist `PKG-INFO` should not expose dependency groups as referenceable metadata fields. [dependency-groups]

The dependency-groups specification defines no standard syntax or interface for installing or referring to dependency groups. [dependency-groups]

## III. How The Standards Affect Installer Behavior

### A. `pyproject.toml` Controls Source Builds

`pyproject.toml` matters most before the installer has a wheel. The `[build-system]` table declares build requirements, and the official packaging tutorial explains that frontends should install those requirements automatically and usually build in isolated environments. The `build-backend` value names the Python object used to perform the build. That makes compatibility depend on build isolation, backend availability, and correct error handling for malformed build configuration. [pyproject] [packaging-tutorial]

The `[project]` table then standardizes the source declaration of core metadata. Static fields are fixed by the project author, while `dynamic` marks fields that the backend will provide later. Installers should not assume all source metadata is available before invoking the backend, and backends must respect the boundary: statically specified metadata cannot be changed, and fields not listed as dynamic cannot be filled in by the backend. [pyproject]

### B. Core Metadata Is The Installer's Artifact API

Core metadata is the compatibility layer installers should prefer once they are evaluating a wheel or built metadata from a source distribution. `Requires-Python` lets tools filter candidates by Python version, `Requires-Dist` supplies the dependency graph with version specifiers and environment markers, and `Provides-Extra` names optional features whose conditional requirements are added when requested. [core-metadata]

`Metadata-Version` is also a direct compatibility gate. Consumers are expected to warn when metadata uses a newer minor version than they support, but they must fail on unsupported newer major versions. This gives installers a clear forward-compatibility posture: tolerate known-format evolution when possible, but do not silently process a metadata format whose major version may have incompatible semantics. [core-metadata]

The `Dynamic` field adds another practical limit: metadata should be evaluated for the artifact actually selected. For source distributions, `Dynamic` constrains what may change in wheels built from that sdist. Outside source distributions, it is informational, and the core metadata spec warns that prebuilt wheels, sdists, and other wheels for the same project release should not be assumed to have interchangeable metadata. [core-metadata]

### C. Dependency Groups Are Not Extras

Dependency groups standardize local requirement lists under `[dependency-groups]` in `pyproject.toml`; they are suitable for development, testing, linting, or projects that are not built for distribution. Their compatibility value is real, but it is not the same value as extras. Extras are represented in core metadata through `Provides-Extra` and conditional `Requires-Dist`; dependency groups are excluded from built distribution metadata. [dependency-groups] [core-metadata]

That means an installer can support dependency groups only through a dedicated interface. The specification does not define a syntax for installing or referring to them, and tools may treat a dependency group name that collides with an extra name as an error. Tools also need careful validation behavior: group names are normalized for comparison, includes must expand in place without deduplication, cycles must be rejected, and unrelated unused groups should not be eagerly validated unless the tool has a reason. [dependency-groups]

## IV. Practical Compatibility Bottom Line

The clean installer model is:

- Use `pyproject.toml` to build source trees and produce metadata.
- Use core metadata to resolve install candidates, runtime dependencies, extras, Python-version compatibility, and parser compatibility.
- Treat dependency groups as opt-in source-tree workflow data, not as wheel metadata and not as portable extras.

The main compatibility failures follow those boundaries. A source fallback can fail because build requirements are missing or the backend cannot be invoked. A resolver can choose the wrong candidate if it ignores `Requires-Python` or mishandles environment markers. An extras implementation can become ambiguous if it treats dependency groups as extras without an explicit tool interface. A future metadata release can be mishandled if the installer does not apply the `Metadata-Version` warn-versus-fail rule.

## V. Future Implications

The likely direction is more standardization around source-tree workflows without making those workflows part of distribution metadata. Dependency groups give tools a shared file format for development requirements, but the specification's decision not to put groups into wheel `METADATA` preserves a stable runtime installation contract. For modern installers, the durable path is to keep adding explicit interfaces around new source-tree capabilities while keeping core metadata as the artifact-level API. That separation matters as metadata versions advance: installers that implement strict metadata-version handling and artifact-specific metadata evaluation will be able to adopt new fields without confusing local development configuration with portable distribution behavior.

[pyproject]: https://packaging.python.org/en/latest/specifications/pyproject-toml/
[core-metadata]: https://packaging.python.org/en/latest/specifications/core-metadata/
[dependency-groups]: https://packaging.python.org/en/latest/specifications/dependency-groups/
[packaging-tutorial]: https://packaging.python.org/en/latest/tutorials/packaging-projects/
