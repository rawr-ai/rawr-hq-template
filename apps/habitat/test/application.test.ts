import { execFileSync, spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CreateNodesResultArray } from "@nx/devkit";
import { afterEach, describe, expect, it } from "vitest";
import { createNodes } from "../src/nx-plugin";

type RuleFixture = Readonly<{
  id: string;
  runner: "grit" | "structure";
}>;

type WorkspaceFixture = Readonly<{
  configFiles: readonly string[];
  root: string;
}>;

type SourceCliResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceEntrypoint = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const fixtureRoots: string[] = [];

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) {
    const basename = path.basename(root);
    if (path.dirname(root) !== tmpdir() || !basename.startsWith("habitat-app-test-")) {
      throw new Error(`Refusing to remove unexpected test fixture: ${root}`);
    }
    const stats = await lstat(root);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Refusing to remove non-directory test fixture: ${root}`);
    }
    await rm(root, { recursive: true, force: true });
  }
});

describe("Habitat app composition", () => {
  it("keeps source Oclif and native Nx bound to the same workspace semantics", async () => {
    const alpha = await makeWorkspace({
      instanceId: "alpha-package",
      ownerProject: "@rawr/alpha",
      projectPath: "packages/alpha",
      rules: [
        { id: "alpha_structure", runner: "structure" },
        { id: "beta_grit", runner: "grit" },
      ],
    });
    const bravo = await makeWorkspace({
      instanceId: "bravo-package",
      ownerProject: "@rawr/bravo",
      projectPath: "packages/bravo",
      rules: [{ id: "bravo_structure", runner: "structure" }],
    });

    const alphaResolve = await runSourceCli(alpha.root, ["resolve"]);
    const bravoResolve = await runSourceCli(bravo.root, ["resolve"]);
    expect(alphaResolve).toMatchObject({ exitCode: 0, stderr: "" });
    expect(bravoResolve).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(alphaResolve.stdout)).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [{ id: "alpha-package", ownerProject: "@rawr/alpha" }],
        applications: [
          { instanceId: "alpha-package", ruleId: "alpha_structure" },
          { instanceId: "alpha-package", ruleId: "beta_grit" },
        ],
      },
    });
    expect(JSON.parse(bravoResolve.stdout)).toMatchObject({
      _tag: "Resolved",
      catalog: {
        instances: [{ id: "bravo-package", ownerProject: "@rawr/bravo" }],
        applications: [{ instanceId: "bravo-package", ruleId: "bravo_structure" }],
      },
    });

    const firstAlpha = await projectWorkspace(alpha, [...alpha.configFiles].reverse());
    const projectedBravo = await projectWorkspace(bravo, bravo.configFiles);
    const secondAlpha = await projectWorkspace(alpha, alpha.configFiles);

    expect(firstAlpha).toEqual(secondAlpha);
    expect(firstAlpha).not.toEqual(projectedBravo);

    const alphaProjects = projectMap(firstAlpha);
    const bravoProjects = projectMap(projectedBravo);
    expect(Object.keys(alphaProjects)).toEqual(["packages/alpha"]);
    expect(Object.keys(bravoProjects)).toEqual(["packages/bravo"]);
    expect(Object.keys(alphaProjects["packages/alpha"]?.targets ?? {})).toEqual([
      "check:policy",
      "habitat:application:alpha-package:alpha_structure",
      "habitat:application:alpha-package:beta_grit",
    ]);
    expect(Object.keys(bravoProjects["packages/bravo"]?.targets ?? {})).toEqual([
      "check:policy",
      "habitat:application:bravo-package:bravo_structure",
    ]);
    expect(
      alphaProjects["packages/alpha"]?.targets?.[
        "habitat:application:alpha-package:alpha_structure"
      ]?.inputs
    ).toContainEqual({ env: "HABITAT_COMMAND_TIMEOUT_MS" });
  }, 15_000);

  it("runs both app-selected production providers through native Oclif", async () => {
    const fixture = await makeWorkspace({
      instanceId: "mixed-package",
      ownerProject: "@rawr/mixed",
      projectPath: "packages/mixed",
      rules: [
        { id: "alpha_structure", runner: "structure" },
        { id: "beta_grit", runner: "grit" },
      ],
    });

    const checked = await runSourceCli(fixture.root, ["check"], undefined, 45_000);
    expect(checked).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(checked.stdout)).toMatchObject({
      _tag: "Completed",
      ok: true,
      applications: [
        {
          instanceId: "mixed-package",
          ruleId: "alpha_structure",
          runner: "habitat",
          status: "pass",
          disposition: { kind: "evaluated" },
        },
        {
          instanceId: "mixed-package",
          ruleId: "beta_grit",
          runner: "grit",
          status: "pass",
          disposition: { kind: "evaluated" },
          findings: [],
        },
      ],
    });
  }, 60_000);

  it("accepts an unset command-timeout override at process activation", async () => {
    const result = await runSourceCli(appRoot, ["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("USAGE");
  });

  it.each([
    "0",
    "1.5",
    "600001",
  ])("rejects HABITAT_COMMAND_TIMEOUT_MS=%s at process activation", async (timeout) => {
    const result = await runSourceCli(appRoot, ["--help"], timeout);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      "HABITAT_COMMAND_TIMEOUT_MS must be an integer from 1 through 600000."
    );
  });
});

async function makeWorkspace(input: {
  readonly instanceId: string;
  readonly ownerProject: string;
  readonly projectPath: string;
  readonly rules: readonly RuleFixture[];
}): Promise<WorkspaceFixture> {
  const root = await mkdtemp(path.join(tmpdir(), "habitat-app-test-"));
  fixtureRoots.push(root);
  const blueprintPath = ".habitat/blueprints/package/blueprint.toml";
  const manifestPath = `${input.projectPath}/habitat.toml`;
  const files: Record<string, string> = {
    [blueprintPath]: blueprintToml(input.rules),
    [manifestPath]: instanceToml(input),
    [`${input.projectPath}/allowed.ts`]: "allowed();\n",
  };

  for (const rule of input.rules) {
    const blueprintRoot = ".habitat/blueprints/package";
    files[`${blueprintRoot}/${rule.id}.${rule.runner === "grit" ? "md" : "structure.toml"}`] =
      rule.runner === "grit"
        ? `# ${rule.id}\n\n\`\`\`grit\nlanguage js(typescript)\n\`forbidden()\`\n\`\`\`\n`
        : passingStructureToml();
  }

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore" });

  return {
    configFiles: [blueprintPath, manifestPath],
    root,
  };
}

function blueprintToml(rules: readonly RuleFixture[]): string {
  const ruleDocuments = rules
    .map((rule) => {
      const runner =
        rule.runner === "structure"
          ? `[rules.runner]\nname = "habitat"\nmode = "structure"\nstructure = "${rule.id}.structure.toml"`
          : `[rules.runner]\nname = "grit"\npattern = "${rule.id}.md"\npatternName = "${rule.id}"\n\n[rules.runner.acquisition]\nkind = "check"\nrootRoles = ["project"]\nselections = []`;
      return `[[rules]]\nid = "${rule.id}"\nlane = "enforced"\nmessage = "${rule.id} found a violation."\nremediate = "Fix ${rule.id}."\n\n${runner}`;
    })
    .join("\n\n");

  return `schemaVersion = 1\nid = "package"\nversion = 1\n\n${ruleDocuments}\n\n[instance]\nmanifest = "habitat.toml"\nanchorRoot = "project"\nselections = []\n\n[[instance.roots]]\nid = "project"\nrequired = true\nkind = "directory"\n`;
}

function instanceToml(input: {
  readonly instanceId: string;
  readonly ownerProject: string;
  readonly projectPath: string;
}): string {
  return `schemaVersion = 1\nid = "${input.instanceId}"\nownerProject = "${input.ownerProject}"\nblueprint = "package"\nblueprintVersion = 1\n\n[roots]\nproject = "${input.projectPath}"\n\n[selections]\n`;
}

function passingStructureToml(): string {
  return `schemaVersion = 2\n\n[[scopes]]\nname = "project"\nrootRole = "project"\nrelativePath = "."\nkind = "directory"\nmode = "open"\n`;
}

async function runSourceCli(
  workspaceRoot: string,
  args: readonly string[],
  timeout?: string,
  processTimeoutMs = 4_000
): Promise<SourceCliResult> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.HABITAT_COMMAND_TIMEOUT_MS;
  env.NO_COLOR = "1";
  if (timeout !== undefined) env.HABITAT_COMMAND_TIMEOUT_MS = timeout;

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [sourceEntrypoint, ...args], {
      cwd: workspaceRoot,
      env,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(processTimer);
      finish();
    };
    const processTimer = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => {
        reject(new Error(`Habitat source command exceeded ${processTimeoutMs}ms.`));
      });
    }, processTimeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (exitCode) => {
      settle(() => {
        resolve({
          exitCode: exitCode ?? 1,
          stderr: stderr.join(""),
          stdout: stdout.join(""),
        });
      });
    });
  });
}

async function projectWorkspace(
  fixture: WorkspaceFixture,
  configFiles: readonly string[]
): Promise<CreateNodesResultArray> {
  return createNodes[1](configFiles, undefined, {
    workspaceRoot: fixture.root,
    nxJsonConfiguration: {},
  });
}

function projectMap(result: CreateNodesResultArray) {
  return Object.fromEntries(
    result.flatMap(([, projected]) => Object.entries(projected.projects ?? {}))
  );
}
