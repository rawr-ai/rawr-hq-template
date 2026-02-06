# Plugin Build and Wiring Matrix

## Goal

Show every supported plugin build + wiring path, and exactly how discovery works.

## Command Surface Invariant

- Channel A: `rawr plugins ...` (oclif plugin manager)
- Channel B: `rawr hq plugins ...` (workspace runtime plugins)

Do not mix command families.

## Build Paths

### 1) Local runtime plugin scaffold (Channel B-first)

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
rawr factory plugin new my-plugin --kind both
bunx turbo run build --filter=@rawr/plugin-my-plugin
bunx turbo run test --filter=@rawr/plugin-my-plugin
```

Defaults generated:
- `private: true`
- `rawr.templateRole: operational`
- `rawr.publishTier: blocked`

### 2) Publish-ready runtime plugin scaffold

```bash
rawr factory plugin new my-plugin --kind both --publish-ready
```

Difference:
- sets publish-ready posture (`private: false`, `publishTier: candidate`).

### 3) Local oclif command plugin (Channel A)

Build command plugin package with valid `oclif` manifest and compiled commands under `dist/src/commands/*`.

### 4) Published oclif plugin

Same as local oclif plugin, plus package ownership/versioning/release to npm or Git source.

## Wiring and Discovery Paths

### Channel B (workspace runtime, no install)

Discovery:
- scans `plugins/*` in workspace root
- reads `package.json.rawr.{templateRole,channel,publishTier}`
- persisted enablement state in `.rawr/state/state.json`

Commands:
```bash
rawr hq plugins list --json
rawr hq plugins enable my-plugin --risk balanced
rawr hq plugins status --json
```

### Channel A local dev (install/link required, publish not required)

Commands:
```bash
rawr plugins link /absolute/path/to/plugin --install
rawr plugins inspect @scope/plugin-name --json
rawr <plugin-command>
```

Meaning:
- `link` is the wiring step into user/global CLI plugin manager.

### Channel A published install

Commands:
```bash
rawr plugins install @scope/plugin-name
# or
rawr plugins install https://github.com/org/repo
rawr plugins inspect @scope/plugin-name --json
```

Meaning:
- published source is installed via oclif plugin manager and then commands are discoverable.

## Minimal Correct Sequences

1. Fast local runtime path (Channel B):
- `create plugin -> build -> rawr hq plugins enable`

2. Global command plugin path (Channel A):
- `create command plugin -> build -> rawr plugins link <abs-path>`

3. Installation requirement:
- Channel A requires a wiring step (`link` or `install`).
- Channel B does not require publish/install for local workspace usage.
