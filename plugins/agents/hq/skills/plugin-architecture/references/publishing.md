# Publishing (Workflow Shape)

Treat publishing as a pipeline with explicit gates, not a one-off manual checklist.

## Pipeline shape

1. Validate structure and manifests.
2. Produce a manifest/listing of what is being published.
3. Run deterministic build/test gates.
4. Produce artifacts (zips, release notes, version bumps) as needed.

## Reporter vs actor framing

- Reporter steps gather facts (audit/manifest/sync outputs).
- Actor steps interpret results and decide what to do next (publish, roll back, request confirmation).

