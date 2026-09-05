import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dir, "../..");

test("native adapter law checks acquired literal sources without banning deferred execution", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "habitat-adapter-law-"));
  async function files(input: Record<string, string>) {
    for (const [name, source] of Object.entries(input)) {
      await mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await writeFile(path.join(root, name), source);
    }
  }
  async function check() {
    const child = Bun.spawn(
      [
        path.join(workspaceRoot, "node_modules/.bin/habitat"),
        "check",
        "--instance",
        "adapter-proof",
        "--rule",
        "runtime_process_runtime_v2_adapter_imports",
      ],
      {
        cwd: root,
        env: { ...process.env, NO_COLOR: "1", GRIT_TELEMETRY_DISABLED: "true" },
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const timer = setTimeout(() => child.kill(), 25_000);
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]).finally(() => clearTimeout(timer));
    const report = JSON.parse(stdout) as {
      _tag: string;
      ok: boolean;
      applications: { status: string; findings: { path: string }[] }[];
    };
    expect(report._tag, stderr || stdout).toBe("Completed");
    return { code, report };
  }
  try {
    await cp(
      path.join(workspaceRoot, ".habitat/blueprints/runtime-process-runtime/versions/2"),
      path.join(root, ".habitat/blueprints/runtime-process-runtime"),
      { recursive: true }
    );
    await symlink(path.join(workspaceRoot, "node_modules"), path.join(root, "node_modules"));
    await files({
      "package.json": JSON.stringify({ name: "adapter-law-proof", private: true }),
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { "runtime-process-runtime": "owner" },
      }),
      "owner/project.json": JSON.stringify({ name: "runtime-process-runtime" }),
      "owner/habitat.toml":
        'schemaVersion = 1\nid = "adapter-proof"\nownerProject = "runtime-process-runtime"\nblueprint = "runtime-process-runtime"\nblueprintVersion = 2\n[roots]\nproject = "owner"\n[selections]\n',
      "owner/src/surface-adapter.ts":
        'import type { WithEffectContext } from "@orpc/experimental-effect";\n',
      "owner/src/adapters/nested/lower.ts":
        'export const lower = (runtime, boundary) => ({ invoke: invocation => runtime.execute({ boundary, invocation }) });\nconst example = "effect/Effect";\nvoid import("other-package", { with: { note: "effect" } });\n',
      "owner/src/execution-runtime.ts": 'import { Effect } from "effect";\n',
      "owner/test/native.test.ts": 'import { ManagedRuntime } from "effect";\n',
    });
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    const positive = await check();
    expect(positive.code).toBe(0);
    expect(positive.report.ok).toBe(true);
    expect(positive.report.applications).toHaveLength(1);
    expect(positive.report.applications[0].findings).toEqual([]);
    const forbidden = {
      "owner/src/surface-adapter.ts": 'import type { Effect } from "effect";\n',
      "owner/src/adapters/static.ts": 'import { Effect } from "effect";\n',
      "owner/src/adapters/reexport.ts": 'export * from "effect/Effect";\n',
      "owner/src/adapters/dynamic.ts":
        'void import("effect/ManagedRuntime", { with: { type: "json" } });\n',
      "owner/src/adapters/require.ts": 'require("effect/Layer");\n',
    };
    await files(forbidden);
    const negative = await check();
    expect(negative.report.ok).toBe(false);
    expect(negative.report.applications[0].status).toBe("fail");
    expect(
      [...new Set(negative.report.applications[0].findings.map((f) => f.path))].sort()
    ).toEqual(Object.keys(forbidden).sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
