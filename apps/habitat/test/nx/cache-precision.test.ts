import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCommand } from "@rawr/test-utils";
import { afterEach, describe, expect, it } from "vitest";

type Invocation = Readonly<{
  args: readonly string[];
  cwd: string;
}>;

type NxFixture = Readonly<{
  invocationLog: string;
  root: string;
}>;

type NativeProject = Readonly<{
  root: string;
  targets: Readonly<Record<string, Readonly<{ inputs?: readonly unknown[] }>>>;
}>;

const FIXTURE_PREFIX = "habitat-nx-cache-";
const temporaryParent = await realpath(tmpdir());
const repositoryRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const nxCli = path.join(repositoryRoot, "node_modules/nx/dist/bin/nx.js");
const habitatNxPlugin = path.join(repositoryRoot, "apps/habitat/dist/nx-plugin.js");
const NATIVE_NX_COMMAND_TIMEOUT_MS = 15_000;
const HABITAT_CLI_VERSION_RANGE = "^0.5.0";
const fixtureRoots: string[] = [];
const focusedTargets = ["habitat:rule:rule-a", "habitat:rule:rule-b"] as const;
const allTargets = [...focusedTargets, "check:policy"] as const;

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) await removeFixture(root);
});

describe("Habitat native Nx cache precision", () => {
  it("keeps the owner union precise while preserving every declared invalidation", async () => {
    const fixture = await createFixture();
    const project = await readNativeProject(fixture);

    expect(project.root).toBe(".");
    expect(project.targets["habitat:rule:rule-a"]?.inputs).not.toContain("{workspaceRoot}/**/*");
    expect(project.targets["check:policy"]?.inputs).toContainEqual({
      env: "NX_WORKSPACE_ROOT_PATH",
    });

    expectCalls(await runNx(fixture, ["check:policy"]), ["check --owner fixture"], fixture.root);
    expectCalls(await runNx(fixture, ["check:policy"]), [], fixture.root);

    expectCalls(
      await runNx(fixture, focusedTargets),
      ["check --rule rule-a", "check --rule rule-b"],
      fixture.root
    );
    expectCalls(await runNx(fixture, allTargets), [], fixture.root);
    expectCalls(await runNx(fixture, ["test:outside"]), ["sentinel"], fixture.root);
    expectCalls(await runNx(fixture, ["test:outside"]), [], fixture.root);

    await writeFixtureFile(fixture.root, "unrelated/notes.txt", "outside the policy union\n");
    expectCalls(await runNx(fixture, [...allTargets, "test:outside"]), ["sentinel"], fixture.root);

    await writeFixtureFile(fixture.root, "subject/b/covered.ts", "export const b = 2;\n");
    expectCalls(
      await runNx(fixture, allTargets),
      ["check --owner fixture", "check --rule rule-b"],
      fixture.root
    );
    expectCalls(await runNx(fixture, allTargets), [], fixture.root);

    const addedSource = "subject/a/added.ts";
    await writeFixtureFile(fixture.root, addedSource, "export const added = 1;\n");
    expectCalls(
      await runNx(fixture, allTargets),
      ["check --owner fixture", "check --rule rule-a"],
      fixture.root
    );
    await writeFixtureFile(fixture.root, "subject/a/changed.ts", "export const changed = 200;\n");
    expectCalls(
      await runNx(fixture, allTargets),
      ["check --owner fixture", "check --rule rule-a"],
      fixture.root
    );
    await unlink(path.join(fixture.root, "subject/a/deleted.ts"));
    expectCalls(
      await runNx(fixture, allTargets),
      ["check --owner fixture", "check --rule rule-a"],
      fixture.root
    );

    await writeRuleManifest(fixture.root, "rule-a", "subject/a/**/*.ts", "changed manifest");
    expectCalls(await runNx(fixture, allTargets), allInvocations(), fixture.root);

    await writeFixtureFile(fixture.root, ".habitat/rules/rule-a/baseline.json", "[]  \n");
    expectCalls(await runNx(fixture, allTargets), allInvocations(), fixture.root);

    await writeFixtureFile(
      fixture.root,
      ".habitat/rules/rule-a/pattern.md",
      gritPattern("rule-a", "changed runner")
    );
    expectCalls(await runNx(fixture, allTargets), allInvocations(), fixture.root);

    await writeFixtureFile(
      fixture.root,
      ".habitat/index.json",
      `${JSON.stringify(
        {
          $comment: "changed catalog",
          schemaVersion: 2,
          ownerRoots: { fixture: "." },
        },
        null,
        2
      )}\n`
    );
    expectCalls(await runNx(fixture, allTargets), allInvocations(), fixture.root);

    await writePackageLock(fixture.root, "0.5.2");
    expectCalls(await runNx(fixture, allTargets), allInvocations(), fixture.root);

    const timeoutEnvironment = { HABITAT_COMMAND_TIMEOUT_MS: "1000" };
    expectCalls(
      await runNx(fixture, allTargets, timeoutEnvironment),
      allInvocations(),
      fixture.root
    );

    const explicitRootEnvironment = {
      ...timeoutEnvironment,
      NX_WORKSPACE_ROOT_PATH: fixture.root,
    };
    expectCalls(
      await runNx(fixture, allTargets, explicitRootEnvironment),
      allInvocations(),
      fixture.root
    );
    expectCalls(await runNx(fixture, ["check:policy"], explicitRootEnvironment), [], fixture.root);

    await writeFixtureFile(fixture.root, "subject/b/covered.ts", "export const b = 3;\n");
    expectCalls(
      await runNx(fixture, ["check:policy"], explicitRootEnvironment),
      ["check --owner fixture"],
      fixture.root
    );
  }, 60_000);
});

async function createFixture(): Promise<NxFixture> {
  const root = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  fixtureRoots.push(root);
  const invocationLog = path.join(root, "invocations.jsonl");

  await writeFixtureFile(
    root,
    "package.json",
    `${JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        private: true,
        dependencies: { "@habitat-ai/cli": HABITAT_CLI_VERSION_RANGE },
      },
      null,
      2
    )}\n`
  );
  await writePackageLock(root, "0.5.1");
  await writeFixtureFile(
    root,
    "project.json",
    `${JSON.stringify(
      {
        name: "fixture",
        targets: {
          "test:outside": {
            cache: true,
            command: "habitat sentinel",
            inputs: ["{workspaceRoot}/unrelated/**/*"],
            outputs: [],
          },
        },
      },
      null,
      2
    )}\n`
  );
  await writeFixtureFile(
    root,
    "nx.json",
    `${JSON.stringify(
      {
        $schema: path.join(repositoryRoot, "node_modules/nx/schemas/nx-schema.json"),
        neverConnectToCloud: true,
        plugins: [habitatNxPlugin],
      },
      null,
      2
    )}\n`
  );
  await writeFixtureFile(
    root,
    ".habitat/index.json",
    `${JSON.stringify({ schemaVersion: 2, ownerRoots: { fixture: "." } }, null, 2)}\n`
  );
  await writeRule(root, "rule-a", "subject/a/**/*.ts", "initial manifest");
  await writeRule(root, "rule-b", "subject/b/**/*.ts", "initial manifest");
  await writeFixtureFile(root, "subject/a/covered.ts", "export const a = 1;\n");
  await writeFixtureFile(root, "subject/a/changed.ts", "export const changed = 1;\n");
  await writeFixtureFile(root, "subject/a/deleted.ts", "export const deleted = true;\n");
  await writeFixtureFile(root, "subject/b/covered.ts", "export const b = 1;\n");
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(path.join(repositoryRoot, "node_modules/nx"), path.join(root, "node_modules/nx"));

  const shim = path.join(root, "bin/habitat");
  await writeFixtureFile(
    root,
    "bin/habitat",
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
appendFileSync(
  process.env.HABITAT_INVOCATION_LOG,
  JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }) + "\\n"
);
`
  );
  await chmod(shim, 0o755);

  return { invocationLog, root };
}

async function writeRule(
  root: string,
  id: "rule-a" | "rule-b",
  coverage: string,
  title: string
): Promise<void> {
  await writeRuleManifest(root, id, coverage, title);
  const ruleRoot = `.habitat/rules/${id}`;
  await writeFixtureFile(root, `${ruleRoot}/baseline.json`, "[]\n");
  await writeFixtureFile(root, `${ruleRoot}/pattern.md`, gritPattern(id, "initial runner"));
}

async function writePackageLock(root: string, resolvedCliVersion: string): Promise<void> {
  await writeFixtureFile(
    root,
    "package-lock.json",
    `${JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        lockfileVersion: 3,
        requires: true,
        packages: {
          "": {
            name: "fixture",
            version: "1.0.0",
            dependencies: { "@habitat-ai/cli": HABITAT_CLI_VERSION_RANGE },
          },
          "node_modules/@habitat-ai/cli": { version: resolvedCliVersion },
        },
      },
      null,
      2
    )}\n`
  );
}

async function writeRuleManifest(
  root: string,
  id: "rule-a" | "rule-b",
  coverage: string,
  title: string
): Promise<void> {
  const ruleRoot = `.habitat/rules/${id}`;
  const rule = {
    schemaVersion: 2,
    id,
    title,
    placement: { niche: "fixture", blueprint: "_self", category: "quality" },
    operation: { kind: "check" },
    ownerProject: "fixture",
    lane: "enforced",
    forbids: `${id} fixture violation`,
    why: `${id} exercises native Nx hashing.`,
    remediate: `Repair ${id}.`,
    message: `${id} found a fixture violation.`,
    pathCoverage: [{ kind: "exact-path", patterns: [coverage] }],
    supportFiles: { baseline: `${ruleRoot}/baseline.json` },
    hookCheck: true,
    runner: {
      name: "grit",
      files: { pattern: `${ruleRoot}/pattern.md` },
      patternName: id.replace("-", "_"),
      acquisition: { kind: "check", roots: ["."] },
    },
  };

  await writeFixtureFile(root, `${ruleRoot}/rule.json`, `${JSON.stringify(rule, null, 2)}\n`);
}

function gritPattern(id: string, marker: string): string {
  return `# ${id} ${marker}\n\n\`\`\`grit\nlanguage js(typescript)\n\`fixture()\`\n\`\`\`\n`;
}

async function writeFixtureFile(
  root: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

async function runNx(
  fixture: NxFixture,
  targets: readonly string[],
  environment: Readonly<Record<string, string>> = {}
): Promise<readonly Invocation[]> {
  const before = await readInvocations(fixture.invocationLog);
  const env = nativeNxEnvironment(fixture, environment);

  const result = await runCommand(
    process.execPath,
    [
      nxCli,
      "run-many",
      `--projects=fixture`,
      `--targets=${targets.join(",")}`,
      "--parallel=1",
      "--outputStyle=static",
    ],
    { cwd: fixture.root, env, timeoutMs: NATIVE_NX_COMMAND_TIMEOUT_MS }
  );
  if (result.exitCode !== 0) {
    throw new Error(`Native Nx fixture failed:\n${result.stderr}\n${result.stdout}`);
  }

  return (await readInvocations(fixture.invocationLog)).slice(before.length);
}

async function readNativeProject(fixture: NxFixture): Promise<NativeProject> {
  const result = await runCommand(
    process.execPath,
    [nxCli, "show", "project", "fixture", "--json"],
    {
      cwd: fixture.root,
      env: nativeNxEnvironment(fixture),
      timeoutMs: NATIVE_NX_COMMAND_TIMEOUT_MS,
    }
  );
  if (result.exitCode !== 0) {
    throw new Error(`Native Nx fixture graph failed:\n${result.stderr}\n${result.stdout}`);
  }
  return JSON.parse(result.stdout) as NativeProject;
}

function nativeNxEnvironment(
  fixture: NxFixture,
  environment: Readonly<Record<string, string>> = {}
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HABITAT_INVOCATION_LOG: fixture.invocationLog,
    NO_COLOR: "1",
    NX_DAEMON: "false",
    NX_CACHE_DIRECTORY: path.join(fixture.root, ".nx/cache"),
    NX_ISOLATE_PLUGINS: "false",
    NX_SKIP_REMOTE_CACHE: "true",
    NX_TASKS_RUNNER_DYNAMIC_OUTPUT: "false",
    NX_WORKSPACE_DATA_DIRECTORY: path.join(fixture.root, ".nx/workspace-data"),
    PATH: `${path.join(fixture.root, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  delete env.FORCE_COLOR;
  delete env.HABITAT_COMMAND_TIMEOUT_MS;
  delete env.NX_DRY_RUN;
  delete env.NX_DISABLE_NX_CACHE;
  delete env.NX_PROJECT_GRAPH_CACHE_DIRECTORY;
  delete env.NX_SKIP_NX_CACHE;
  delete env.NX_WORKSPACE_ROOT_PATH;
  Object.assign(env, environment);
  return env;
}

function expectCalls(
  invocations: readonly Invocation[],
  expected: readonly string[],
  workspaceRoot: string
): void {
  expect(invocations.map(({ args }) => args.join(" ")).sort()).toEqual([...expected].sort());
  expect(invocations.every(({ cwd }) => cwd === workspaceRoot)).toBe(true);
}

function allInvocations(): readonly string[] {
  return ["check --owner fixture", "check --rule rule-a", "check --rule rule-b"];
}

async function readInvocations(log: string): Promise<readonly Invocation[]> {
  try {
    return (await readFile(log, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Invocation);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function removeFixture(root: string): Promise<void> {
  const stats = await lstat(root);
  const canonical = await realpath(root);
  const basename = path.basename(canonical);
  const suffix = basename.slice(FIXTURE_PREFIX.length);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !basename.startsWith(FIXTURE_PREFIX) ||
    suffix.length !== 6 ||
    !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error(`Refusing to remove unexpected native Nx fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}
