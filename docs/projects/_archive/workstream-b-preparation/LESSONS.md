# Workstream B Removal Lesson Candidates

This file is for lessons carried by specific code/docs that future Workstream B
lanes remove or sunset. It is not a place for generic project wisdom.

Rule for future implementation sessions: before deleting a surface, inspect the
exact files being removed. If the deleted code contains a reusable platform
capability, safety invariant, test pattern, failure mode, or design constraint,
capture that concrete lesson here or in a lane-local `LESSONS.md`.

Do not record a lesson just because a removed surface existed. Record only what
would otherwise be lost and what future implementers are likely to need.

## Upstream Fallout: `plugins/web/mfe-demo`

Status: candidate lessons to verify during the future MFE removal diff.

Removal target:

- `plugins/web/mfe-demo/**`
- active `mfe-demo` references in server, CLI, web UI, Vitest config, hq-ops
  tests, and lockfile state.

### Keep: resource-backed platform tests should not depend on a demo plugin

Evidence:

- `services/hq-ops/test/ports-backed-service.test.ts` uses
  `@rawr/plugin-mfe-demo` as the plugin id in the security gate test.

Candidate lesson:

- The interesting capability is not MFE demo. The interesting capability is
  that `hq-ops` can exercise resource-backed platform behavior over primitive
  ports: config layering/mutation, repo-state authority, journal persistence and
  search, security scan reporting, and risk-gate policy.
- When MFE demo is removed, keep that platform test coverage by replacing the
  plugin id with a neutral test-local plugin id or fixture. Do not keep
  `mfe-demo` just to preserve `hq-ops` port-backed coverage.

Future action:

- During upstream-fallout implementation, confirm whether the hq-ops test only
  needs an arbitrary plugin id. If so, replace it with a neutral fixture and
  note that hq-ops security gating is plugin-id agnostic.

### Keep: web plugin serving can be tested with temp fixtures

Evidence:

- `apps/server/test/rawr.test.ts` already creates a temporary web plugin
  fixture with `plugins/web/<dirName>/package.json` and `dist/web.js`.
- The same test currently names that temp fixture `mfe-demo` and uses
  `@rawr/plugin-mfe-demo`.

Candidate lesson:

- Server-side web plugin serving does not require a real workspace demo plugin.
  A test-local fixture is enough to prove disabled plugins return `404` and
  enabled plugins serve a JavaScript module from `/rawr/plugins/web/<dirName>`.

Future action:

- Keep the temp-fixture pattern and rename it away from `mfe-demo`.

### Maybe Keep: plugin status routes can advertise first-party route hints

Evidence:

- `plugins/web/mfe-demo/src/server.ts` registers `/mfe-demo/status`.
- That status body includes `routeHints.firstPartyDefault` with RPC/status and
  publication route examples.
- `plugins/web/mfe-demo/test/mfe-demo.test.ts` asserts those route hints.

Candidate lesson:

- The demo server was carrying a small pattern for plugin-owned status endpoints
  advertising first-party integration routes. If that pattern is still useful
  for the platform, move the assertion to a test-local fixture or future runtime
  docs before deleting the demo package.

Future action:

- During removal, decide whether route-hint status endpoints are still a real
  platform concept. If yes, preserve the test with a neutral fixture. If no,
  do not record it as a retained lesson.

### Maybe Keep: web plugin mount lifecycle coverage

Evidence:

- `plugins/web/mfe-demo/src/web.ts` normalizes `ctx.basePath`, resolves a
  first-party status URL, fetches plugin status, renders loading/ready/error
  state, and returns an `unmount` cleanup handle.
- `plugins/web/mfe-demo/test/mfe-demo.test.ts` verifies mount, async fetch
  settlement, ready state, and DOM cleanup on unmount.

Candidate lesson:

- The reusable capability is the web plugin mount lifecycle: mount with
  `MountContext`, call a route relative to `basePath`, tolerate fetch errors,
  and cleanly unmount DOM state. If that lifecycle is not tested elsewhere, move
  the coverage to a minimal test-local web plugin fixture before deleting the
  demo.

Future action:

- Before deleting `plugins/web/mfe-demo/test/mfe-demo.test.ts`, check whether
  another test covers `MountContext` base-path behavior, async fetch/render, and
  unmount cleanup. Preserve only missing coverage.

### Keep: CLI web plugin tests need a non-demo web fixture

Evidence:

- `apps/cli/test/stubs.test.ts` uses `mfe-demo` to test:
  - `plugins web list` discovers workspace web plugins,
  - `plugins web enable` rejects toolkit plugins by `rawr.kind`,
  - enabling a web plugin persists enabled state,
  - `plugins web status` reflects enabled/disabled state.

Candidate lesson:

- The CLI tests are proving web plugin kind enforcement and state persistence,
  not the demo plugin. Future tests need a stable web fixture, but not
  `mfe-demo`.

Future action:

- Replace these references with a neutral fixture or another retained web
  plugin test fixture. Do not keep the demo package for CLI coverage alone.

## Coordination Canvas

Status: do not prefill generic lessons.

Future action:

- If future cleanup deletes active coordination docs/runbooks, extract only
  concrete operational lessons from those exact documents. Examples of concrete
  lessons might include a route deprecation sequence, a migration invariant, or
  a platform boundary that is still true after coordination is gone.
- Do not record broad statements like "coordination docs can go stale" unless a
  removed document contains a specific reusable process lesson.

## DevOps, Plugin Sync, Undo, Session Tools

Status: no removal lessons captured yet.

Future action:

- These lanes should populate lessons only when implementation removes or
  sunsets concrete code/docs and finds something reusable in the removed
  material.
- Examples that would qualify: a downstream Graphite safety invariant, an undo
  failure-mode contract, a sync retirement edge case, or a session parsing
  fixture pattern.
- Examples that would not qualify: generic authority statements, stale docs are
  stale, or "move this upstream" restated as a lesson.
