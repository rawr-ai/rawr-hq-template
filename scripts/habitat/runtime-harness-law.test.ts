import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dir, "../..");

test("native harness law preserves contract imports and rejects lifecycle-owner imports", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "habitat-harness-law-"));
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
        "harness-proof",
        "--rule",
        "runtime_harnesses_v1_imports",
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
      path.join(workspaceRoot, ".habitat/blueprints/runtime-harnesses"),
      path.join(root, ".habitat/blueprints/runtime-harnesses"),
      { recursive: true }
    );
    await symlink(path.join(workspaceRoot, "node_modules"), path.join(root, "node_modules"));
    await files({
      "package.json": JSON.stringify({ name: "harness-law-proof", private: true }),
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { "runtime-harnesses": "owner" },
      }),
      "owner/project.json": JSON.stringify({ name: "runtime-harnesses" }),
      "owner/habitat.toml":
        'schemaVersion = 1\nid = "harness-proof"\nownerProject = "runtime-harnesses"\nblueprint = "runtime-harnesses"\nblueprintVersion = 1\n[roots]\nproject = "owner"\n[selections]\n',
      "owner/src/harness-descriptor.ts":
        'import type { RuntimeLaunchIdentity } from "../../definition/src/index";\nimport type { ProcessRuntimeAccess } from "../../process-runtime/src/index";\n',
      "owner/src/native/host.ts":
        'import { Effect } from "effect";\nexport const mount = async input => ({ stop: async () => {} });\nconst example = "../../mounting/src/index";\nvoid import("native-host", { with: { note: "@habitat-ai/sdk" } });\n',
      "owner/test/fixture.test.ts":
        'import { provisionProcess } from "../../substrate/effect/src/index";\n',
    });
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    const positive = await check();
    expect(positive.code, JSON.stringify(positive.report)).toBe(0);
    expect(positive.report.ok).toBe(true);
    expect(positive.report.applications).toHaveLength(1);
    expect(positive.report.applications[0].findings).toEqual([]);
    const forbidden = {
      "owner/src/native/sdk.ts": 'import type { HabitatClient } from "@habitat-ai/sdk";\n',
      "owner/src/native/mounting.ts": 'export * from "../../../mounting/src/index";\n',
      "owner/src/native/substrate.ts": 'void import("../../../substrate/effect/src/index");\n',
      "owner/src/native/observation.ts": 'require("../../../observation/src/index");\n',
      "owner/src/native/provider.ts":
        'import { acquire } from "resources/example/providers/native";\n',
    };
    await files(forbidden);
    const negative = await check();
    expect(negative.report.ok).toBe(false);
    expect(negative.report.applications[0].status).toBe("fail");
    expect(
      [...new Set(negative.report.applications[0].findings.map((finding) => finding.path))].sort()
    ).toEqual(Object.keys(forbidden).sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
