# Source Capture: Plugin/CLI Path Matrix (Verbatim)

This file captures the previously provided path matrix narrative and commands verbatim, preserved as the immutable source reference.

Validated against the live CLI in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq` (current command surfaces + scaffolds).

## Assumptions (current system)

1. CLI is Bun-first monorepo (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`).
2. Two plugin channels exist and are intentionally separate:
   - Channel A: `rawr plugins ...` (oclif plugin manager: install/link/inspect).
   - Channel B: `rawr plugins web ...` (workspace runtime plugins: list/enable/disable/status).
3. Global `rawr` currently resolves to Bun symlink:
   - `/Users/mateicanavra/.bun/bin/rawr -> /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/apps/cli/bin/run.js`.

## 1) All CLI build/use paths

1. Repo-local dev run (fastest loop, no global install).
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
bun run rawr -- --help
bun run rawr -- <command>
```
Touches: no files unless command writes artifacts.  
Use when: local development.

2. Repo-local compile/build gate.
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
bun run build
# or CLI-only
bun run --cwd apps/cli build
```
Touches: `dist/**` outputs across packages/apps.  
Use when: validation before commit/PR.

3. Global CLI from local checkout (explicit owner activation).
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
./scripts/dev/activate-global-rawr.sh
rawr doctor global
```
Touches:
- `~/.rawr/global-rawr-owner-path`
- `~/.bun/bin/rawr` symlink
Use when: you want plain `rawr` globally backed by this checkout.

4. Distributed/global CLI from package registry (template-owned release path).
```bash
# generic path if published
bunx @rawr/cli --help
# or global package-manager install path if used by consumers
```
Touches: global package manager install location.  
Use when: consuming published CLI, not local source checkout.

## 2) All plugin build paths

1. Local runtime plugin scaffold (Channel B-first, automated scaffold).
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
rawr factory plugin new my-plugin --kind both
bunx turbo run build --filter=@rawr/plugin-my-plugin
bunx turbo run test --filter=@rawr/plugin-my-plugin
```
Generated files live under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugins/my-plugin/*`.  
Default manifest posture:
- `private: true`
- `rawr.templateRole: operational`
- `rawr.publishTier: blocked`
Use when: personal/local plugin development.

2. Publish-ready runtime plugin scaffold.
```bash
rawr factory plugin new my-plugin --kind both --publish-ready
```
Difference vs local-only: scaffold sets publish-ready posture (`private: false`, `publishTier: candidate`).

3. Local oclif command plugin (Channel A, manual scaffold today).
Use runbook at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/docs/process/PLUGIN_E2E_WORKFLOW.md`.  
Requires plugin package with `oclif.commands` + built `dist/src/commands/*`.

4. Published oclif plugin for others.
Same as (3), plus proper package ownership/versioning and publish process.

## 3) All plugin install/wiring/discovery paths

1. Channel B workspace discovery (no install).
- Discovery source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/plugins/*`.
- Metadata contract: `package.json.rawr.{templateRole,channel,publishTier}`.
- Enablement state persisted in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/.rawr/state/state.json`.
Commands:
```bash
rawr plugins web list --json
rawr plugins web enable my-plugin --risk balanced
rawr plugins web status --json
```
Key point: this is local-workspace discovery; no npm publish required.

2. Channel A local dev wiring (install step required, but no publish required).
```bash
rawr plugins link /absolute/path/to/plugin --install
rawr plugins inspect @scope/plugin-name --json
rawr <plugin-command>
```
Key point: `link` is the wiring step into global/user CLI plugin registry.

3. Channel A published plugin wiring.
```bash
rawr plugins install @scope/plugin-name
# or
rawr plugins install https://github.com/org/repo
rawr plugins inspect @scope/plugin-name --json
```
Key point: here “publish” means package available from npm/GitHub source; install wires it into CLI.

## 4) End-to-end paths (complete)

### Path A: Local runtime plugin, no publish, usable immediately in workspace
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
rawr factory plugin new demo-runtime --kind both
bunx turbo run build --filter=@rawr/plugin-demo-runtime
rawr plugins web enable demo-runtime --risk off
rawr plugins web status --json
```
How CLI knows: scans `plugins/*` in workspace, then reads `.rawr/state/state.json`.  
Caveat: run from inside workspace; outside repo it won’t find workspace root.

### Path B: Local command plugin, no publish, usable by CLI after link
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
# scaffold command plugin package per runbook
bunx turbo run build --filter=@rawr/plugin-demo-oclif
rawr plugins link "$(pwd)/plugins/demo-oclif" --install
rawr plugins inspect @rawr/plugin-demo-oclif --json
rawr demo-hello
```
How CLI knows: oclif user plugin manager registry + plugin manifest.  
Caveat: link/install step is mandatory for Channel A.

### Path C: Published third-party plugin
```bash
rawr plugins install @vendor/plugin-x
rawr plugins inspect @vendor/plugin-x --json
rawr <plugin-command>
```
How CLI knows: installed via oclif plugin manager (npm/GitHub source).  
Caveat: plugin must be correctly packaged for oclif.

### Path D: Global CLI + local workspace runtime plugin
```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
./scripts/dev/activate-global-rawr.sh
rawr factory plugin new demo-global --kind both
bunx turbo run build --filter=@rawr/plugin-demo-global
rawr plugins web enable demo-global --risk off
```
How CLI knows: global `rawr` points to this checkout, then Channel B workspace scan applies.  
Caveat: if you `cd` outside workspace, Channel B commands fail to locate workspace root.

### Path E: Migrate an ad-hoc local script into plugin form
1. If script should become a CLI command: wrap as Channel A oclif plugin command, then `rawr plugins link ...`.
2. If script should become runtime capability in HQ stack: wrap as Channel B plugin (`exports ./server` and/or `./web`), then `rawr plugins web enable ...`.

## 5) What “publish” means here

1. Channel B local runtime path: publish is not required for your own machine. Build + enable is enough.
2. Channel A local path: npm publish is not required, but a wiring step is required (`plugins link` or `plugins install file://...`).
3. Channel A shared distribution: npm/GitHub publish is required if others should install by package/source.

## 6) Direct answer to your core question (minimal correct sequence)

1. If you want local-only plugin usage fastest:  
`create plugin -> build -> rawr plugins web enable` (no publish/install).
2. If you want new CLI commands available globally via plugin manager:  
`create command plugin -> build -> rawr plugins link <abs-path>` (publish optional).
3. So yes: the “extra install/link step” is inherently required for Channel A.  
No: it is not required for Channel B workspace runtime plugins.
