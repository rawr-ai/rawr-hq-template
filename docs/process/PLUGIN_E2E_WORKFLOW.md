# Plugin E2E Workflow

Use this runbook to take a plugin from package creation to local consumption, from repo root, without mixing plugin command surfaces.

In `RAWR HQ-Template`, plugin generation is for fixture/example validation.
Operational plugin authoring belongs in personal `RAWR HQ`.

Detailed end-to-end path runbooks now live under:
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/*`

## Command Surface Contract (Hard Invariant)

- Channel A (external oclif plugin manager): `rawr plugins ...`
  - Use for `link`, `install`, `inspect`.
- Channel B (workspace runtime plugins): `rawr plugins web ...`
  - Use for `list`, `enable`, `disable`, `status`.
- Do not swap command families between channels.

## Preflight (Repo Root)

```bash
pwd
git status --short
bun --version
bun run rawr -- --help
```

Expected:
- cwd is your repo root,
- working tree is in intended state,
- CLI entrypoint works.

## Channel B E2E (Workspace Runtime Plugin)

### 1) Create Package

```bash
cd /absolute/path/to/rawr-hq-template

RUNTIME_DIR="demo-runtime-e2e"
RUNTIME_ID="@rawr/plugin-${RUNTIME_DIR}"

# Plan first (no writes)
bun run rawr -- factory plugin new "$RUNTIME_DIR" --kind both --dry-run --json

# Create files
bun run rawr -- factory plugin new "$RUNTIME_DIR" --kind both --json
```

### 2) Implement

Edit generated files under `plugins/web/$RUNTIME_DIR`:
- `src/server.ts`
- `src/web.ts`
- `test/plugin.test.ts`

Keep exports stable for runtime loading:
- `./server` -> `dist/src/server.js`
- `./web` -> `dist/src/web.js`

### 3) Build And Test

```bash
bunx turbo run build --filter="$RUNTIME_ID"
bunx turbo run test --filter="$RUNTIME_ID"
```

### 4) Local Consume (Channel B Commands Only)

```bash
# Discover plugin ids
bun run rawr -- plugins web list --all --json

# Enable (use risk policy that matches your environment)
bun run rawr -- plugins web enable "$RUNTIME_DIR" --allow-non-operational --json --risk off

# Verify persisted enabled state
bun run rawr -- plugins web status --json

# Disable and re-check
bun run rawr -- plugins web disable "$RUNTIME_DIR" --json
bun run rawr -- plugins web status --json
```

Optional runtime mount check:

```bash
bun run rawr -- dev up
```

## Channel A E2E (External oclif Plugin)

### 1) Create Package

```bash
cd /absolute/path/to/rawr-hq-template

OCLIF_DIR="demo-oclif-e2e"
OCLIF_ID="@rawr/plugin-${OCLIF_DIR}"
OCLIF_CMD="demo-hello"

mkdir -p "plugins/cli/$OCLIF_DIR/src/commands" "plugins/cli/$OCLIF_DIR/test"
```

Create `plugins/cli/$OCLIF_DIR/package.json`:

```json
{
  "name": "@rawr/plugin-demo-oclif-e2e",
  "version": "0.1.0",
  "private": true,
  "description": "RAWR HQ local oclif plugin demo",
  "license": "MIT",
  "type": "module",
  "packageManager": "bun@1.3.7",
  "files": ["dist", "README.md", "package.json"],
  "engines": { "node": ">=20.0.0" },
  "publishConfig": { "access": "public" },
  "dependencies": {
    "@oclif/core": "^4.2.10"
  },
  "oclif": {
    "commands": "./dist/src/commands",
    "topicSeparator": " ",
    "typescript": { "commands": "./src/commands" }
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "bunx tsc -p tsconfig.json",
    "typecheck": "bunx tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
```

Create `plugins/cli/$OCLIF_DIR/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

Create `plugins/cli/$OCLIF_DIR/src/commands/$OCLIF_CMD.ts`:

```ts
import { Command } from "@oclif/core";

export default class DemoHello extends Command {
  static description = "Hello from @rawr/plugin-demo-oclif-e2e";

  async run() {
    this.log("demo-hello");
  }
}
```

Create `plugins/cli/$OCLIF_DIR/test/plugin.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("@rawr/plugin-demo-oclif-e2e", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
```

Create `plugins/cli/$OCLIF_DIR/README.md`:

```md
# @rawr/plugin-demo-oclif-e2e

Local-only oclif plugin demo package.
```

### 2) Build And Test

```bash
bunx turbo run build --filter="$OCLIF_ID"
bunx turbo run test --filter="$OCLIF_ID"
```

### 3) Local Consume (Channel A Commands Only)

```bash
# Link for local development (use absolute path)
bun run rawr -- plugins link "$(pwd)/plugins/cli/$OCLIF_DIR" --install

# Inspect resolved plugin metadata and discovered commands
bun run rawr -- plugins inspect "$OCLIF_ID" --json

# Execute plugin command
bun run rawr -- "$OCLIF_CMD"
```

> **Heads-up: the “disposable worktree” trap**
> - `rawr plugins link` stores an **absolute path** to the plugin directory.
> - If you link from a **disposable git worktree** and later delete it, `rawr` can fail at startup (missing `package.json`).
> - Prefer linking from a **stable checkout path** (your primary worktree), using an absolute path.
> - Recovery: `rawr plugins uninstall <plugin>` (or `rawr plugins reset` to wipe all user-linked plugins).
> - If available, prefer the repo-root helper: `rawr plugins install all`.

### 4) Install Rehearsal (Channel A Install Path)

```bash
# Use file:// for local install rehearsal
bun run rawr -- plugins install "file://$(pwd)/plugins/cli/$OCLIF_DIR"

# Re-inspect to confirm command remains discoverable
bun run rawr -- plugins inspect "$OCLIF_ID" --json
```

## Verification Checkpoints

1. Scaffold plan is deterministic:
   - `factory plugin new ... --dry-run --json` returns `ok: true` and planned paths.
2. Build/test gate passes:
   - `turbo run build/test --filter=<plugin-id>` exits `0`.
3. Channel B state gate passes:
   - `plugins web status --json` shows expected `enabled` transition after enable/disable.
4. Channel A discovery gate passes:
   - `plugins inspect <plugin> --json` includes expected `commandIDs`.
5. Command surface gate passes:
   - Channel A steps use only `rawr plugins ...`.
   - Channel B steps use only `rawr plugins web ...`.

## Common Failure Modes

1. Symptom: `Unable to locate workspace root (expected a ./plugins directory)`.
   - Cause: command run outside repo root/subtree and workspace root can't be inferred.
   - Fix: any of:
     - `cd` to the repo root and rerun
     - set `RAWR_HQ_ROOT=/absolute/path/to/rawr-hq` (or `RAWR_WORKSPACE_ROOT=...`)
     - ensure you're running the repo-first `rawr` wired to your `rawr-hq` checkout (so it can fall back to its install location)
2. Symptom: `Unknown plugin: <id>` on Channel B enable/disable.
   - Cause: wrong id; command accepts package name or directory name.
   - Fix: run `rawr plugins web list --json` and reuse returned id/dir.
3. Symptom: enable blocked by security gate.
   - Cause: risk tolerance disallows current findings.
   - Fix: review security report, reduce findings, or use explicit risk policy/force according to local policy.
4. Symptom: Channel A link works but command missing from inspect.
   - Cause: bad oclif manifest path or missing `dist/src/commands/*`.
   - Fix: verify `package.json#oclif.commands`, rebuild, and re-link.
5. Symptom: `plugins install /abs/path/...` fails with GitHub/registry resolution errors.
   - Cause: plain filesystem path is not treated as install target in this flow.
   - Fix: use `file://<absolute-path>` or published package/git URL.

## Publish Posture

Current default posture is local-only:
- Plugin packages should stay `private: true` until release intent is explicit.
- Local consume should use:
  - Channel A: `plugins link` (and optional `plugins install file://...` rehearsal)
  - Channel B: `plugins web enable|disable|status|list`

## Recommended Operator Loop (Repo Root)

When you want “one command does all of them” workflows, prefer these repo-root entrypoints:

```bash
rawr plugins install all
rawr plugins enable all
rawr plugins sync all --dry-run
rawr plugins sync all
```

Notes:
- `rawr plugins sync ...` also generates Cowork drag-and-drop `.plugin` ZIPs (default: `dist/cowork/plugins/*.plugin`).
- When syncing to Claude targets, it also refreshes plugins via Claude Code (`claude plugin install` + `claude plugin enable`) unless disabled by flags.

To allow npm publish, all of the following must be true:
1. `package.json` sets `"private": false`.
2. Package name/version are release-ready and owned by your npm org/scope.
3. Publish rails are present and correct:
   - `files`
   - `engines`
   - `publishConfig`
   - `README.md`
   - Channel A: `oclif.commands` + `oclif.typescript.commands`
   - Channel B: stable `exports` for `./server` and/or `./web`
4. Build/test gates pass for the package.
5. Install verification passes from a publish-like source:
   - `rawr plugins install <pkg-or-url>` (Channel A)
   - `rawr plugins inspect <plugin>` confirms command discovery (Channel A)
6. Runtime activation checks still pass for workspace runtime packages:
   - `rawr plugins web enable|status|disable` (Channel B)
