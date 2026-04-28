# Semantic Evidence Comparison Cases

There is no root-level `core/` authoring root.

Do not create a root-level `runtime/` authoring root.

Create a root-level `core/` authoring root for shared platform machinery.

Previously, the repo considered a root-level `core/` authoring root during migration planning.

| old pattern | replacement | action |
| --- | --- | --- |
| root-level `core/` authoring root | packages/core/* | Replace |
| packages/core/* | root-level `core/` authoring root | Replace |

The app should use `startServer(...)` as the public start verb.

Do not use `startServer(...)`; use `startApp(...)` instead.

Root-level `core/` authoring root.

Should we keep a root-level `runtime/` authoring root?

The classifier rule pack should emit a constraint graph artifact.

TODO: The project website should use a brighter hero image.

```text
Create a root-level `core/` authoring root.
Use `startServer(...)`.
```

Must prove: There is no root-level `core/` authoring root.

| harness | purpose | must prove |
| --- | --- | --- |
| In-process (`createRouterClient`) | Deterministic server-internal behavior | semantic correctness under trusted context |

Testing MUST preserve graph law and proof-band ratchets.

The architecture MUST preserve meaning when placement changes.
