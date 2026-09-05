import { expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dir, "../..");

/** Exercise source-law admission through the pinned installed CLI, not a local evaluator. */
export async function assertNativeRuntimeImportLaw(input: {
  owner: string;
  version: number;
  rule: string;
  allowed: Readonly<Record<string, string>>;
  forbidden: Readonly<Record<string, string>>;
}): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "habitat-runtime-law-"));
  async function files(entries: Readonly<Record<string, string>>): Promise<void> {
    for (const [name, source] of Object.entries(entries)) {
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
        "runtime-proof",
        "--rule",
        input.rule,
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
    const blueprintRoot = path.join(workspaceRoot, ".habitat/blueprints", input.owner);
    await cp(
      input.version === 1
        ? blueprintRoot
        : path.join(blueprintRoot, "versions", String(input.version)),
      path.join(root, ".habitat/blueprints", input.owner),
      { recursive: true }
    );
    await symlink(path.join(workspaceRoot, "node_modules"), path.join(root, "node_modules"));
    await files({
      "package.json": JSON.stringify({ name: "runtime-law-proof", private: true }),
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { [input.owner]: "owner" },
      }),
      "owner/project.json": JSON.stringify({ name: input.owner }),
      "owner/habitat.toml": [
        "schemaVersion = 1",
        'id = "runtime-proof"',
        `ownerProject = "${input.owner}"`,
        `blueprint = "${input.owner}"`,
        `blueprintVersion = ${input.version}`,
        "[roots]",
        'project = "owner"',
        "[selections]",
        "",
      ].join("\n"),
      ...input.allowed,
    });
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    const positive = await check();
    expect(positive.code, JSON.stringify(positive.report)).toBe(0);
    expect(positive.report.ok).toBe(true);
    expect(positive.report.applications).toHaveLength(1);
    expect(positive.report.applications[0].findings).toEqual([]);
    await files(input.forbidden);
    const negative = await check();
    expect(negative.report.ok).toBe(false);
    expect(negative.report.applications[0].status).toBe("fail");
    expect(
      [...new Set(negative.report.applications[0].findings.map((finding) => finding.path))].sort()
    ).toEqual(Object.keys(input.forbidden).sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
