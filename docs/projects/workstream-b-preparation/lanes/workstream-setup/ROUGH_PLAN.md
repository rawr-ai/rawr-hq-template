# Workstream Setup Rough Plan

## Implementation Slices

1. Create preparation branch in `RAWR HQ-Template`.
2. Create the artifact tree under
   `docs/projects/workstream-b-preparation/`.
3. Write top-level workstream record, authority map, lane packet template, and
   Next Packet.
4. Write one packet per lane.
5. Run artifact and repo-state verification.
6. Commit the docs-only preparation branch with Graphite.

## Likely Touch Surfaces

- `docs/projects/workstream-b-preparation/**`

No code, package, generated, provider-home, install-state, or downstream files
are touched by this setup lane.

## Validation

```bash
git status --short --branch
gt ls
bunx nx show projects
find docs/projects/workstream-b-preparation -type f | sort
```

## Sequencing Notes

Setup must precede future lane implementation sessions. Future sessions should
not edit setup artifacts unless they discover a factual error in preparation
evidence or the user changes the authority frame.

## Stop Conditions

- Repo is dirty with unrelated changes before edits.
- Graphite branch cannot be created cleanly.
- Required artifact paths conflict with existing active project docs.

## DRA Disposition

Accepted and executed by this preparation branch.
