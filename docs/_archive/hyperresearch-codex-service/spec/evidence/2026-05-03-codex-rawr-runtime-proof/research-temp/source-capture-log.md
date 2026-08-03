# Source Capture Log - Width Sweep 2 Source Analyst

Job: 02-width-sweep-2-source-analyst
Query: What are the practical compatibility implications of Python's packaging metadata standards for modern Python project installers? Focus on how pyproject.toml, core metadata, and dependency groups affect installer behavior, and cite only Python Packaging Authority or official Python documentation sources.
Generated: 2026-05-03T03:57:53Z
Source policy: official Python Packaging Authority / Python documentation only.

## Sources reviewed

| URL | Source authority | Coverage | Capture status |
|---|---|---|---|
| https://packaging.python.org/en/latest/specifications/pyproject-toml/ | PyPA specification | pyproject.toml build-system table, project metadata, dependency metadata mapping, dynamic metadata rules | Reviewed and included in packet sourceUrls for parent capture |
| https://packaging.python.org/en/latest/specifications/core-metadata/ | PyPA specification | metadata compatibility, Requires-Dist, Requires-Python, Provides-Extra, Dynamic | Reviewed and included in packet sourceUrls for parent capture |
| https://packaging.python.org/en/latest/specifications/dependency-groups/ | PyPA specification | dependency-groups table, includes, package-building exclusion, installer interface and validation behavior | Reviewed and included in packet sourceUrls for parent capture |
| https://packaging.python.org/en/latest/tutorials/packaging-projects/ | PyPA tutorial | practical build frontend / backend flow and wheel-vs-sdist install behavior | Reviewed and included in packet sourceUrls for parent capture |

## Evidence anchors

1. `pyproject.toml` build behavior: the `[build-system]` table declares build requirements, default semantics apply when the table is absent, and tools should error when the table exists but required fields are missing. Source: PyPA pyproject.toml specification, lines 151-163.
2. `pyproject.toml` project metadata behavior: `[project]` specifies core metadata, including static and dynamic fields; absence of `[project]` means the backend dynamically provides keys. Source: PyPA pyproject.toml specification, lines 192-206.
3. Dependency metadata mapping: `dependencies` maps directly to `Requires-Dist`; `optional-dependencies` maps to `Requires-Dist` plus `Provides-Extra`. Source: PyPA pyproject.toml specification, lines 381-389.
4. Dynamic metadata compatibility: build backends must honor static metadata, cannot fill fields unless they are listed as dynamic, and must error on conflicting static/dynamic declarations. Source: PyPA pyproject.toml specification, lines 431-446.
5. Core metadata dependency resolution inputs: `Requires-Dist` carries requirement names, extras, version specifiers, and markers; `Requires-Python` can guide installer version selection. Source: PyPA core metadata specification, lines 435-466.
6. Extras behavior: `Provides-Extra` names optional features; requested extras cause matching conditional requirements to be evaluated and added. Source: PyPA core metadata specification, lines 506-527.
7. Dependency-group packaging boundary: build backends must not put dependency-group data into built distribution metadata, and the table is not part of built package interfaces. Source: PyPA dependency-groups specification, lines 194-198.
8. Dependency-group installer boundary: there is no standard syntax for installing dependency groups; tools need dedicated interfaces and may treat extra/group name collisions as an error. Source: PyPA dependency-groups specification, lines 199-202.
9. Dependency-group validation: tools should error when processing unrecognized data but should not eagerly validate every group unless necessary. Source: PyPA dependency-groups specification, lines 203-218.
10. Practical build/install flow: PyPA's tutorial identifies `pyproject.toml` as the file that tells build frontends which backend to use, and notes newer pip versions prefer wheels while falling back to source distributions. Source: PyPA packaging tutorial, lines 204-238 and 309-341.

## Analyst note

The sources converge on a compatibility split: build frontends and installers use `pyproject.toml` to build source trees, but once a wheel or sdist metadata file exists, installer resolution should be driven by standardized core metadata. Dependency groups are intentionally outside built metadata, so installers cannot treat them as ordinary extras without a tool-specific interface.
