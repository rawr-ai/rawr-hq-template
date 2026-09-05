import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RuntimeCatalog } from "@habitat-ai/sdk/runtime/observation";
import { expect } from "vitest";

const sources = fileURLToPath(new URL("../fixtures/oclif-runtime", import.meta.url));

export async function buildNativeRuntimeFixture(input: {
  readonly workspaceRoot: string;
  readonly outputRoot: string;
  readonly hostImport: string;
  readonly dependencyPackageJson: string;
}): Promise<void> {
  const sourceRoot = join(input.outputRoot, ".build-src");
  await mkdir(sourceRoot, { recursive: true });
  const dependencyRequire = createRequire(input.dependencyPackageJson);
  const fixtureRequire = createRequire(join(input.outputRoot, "package.json"));
  const dependencies = ["@habitat-ai/sdk", "@oclif/core", "effect"];
  if (input.hostImport.startsWith("@habitat-ai/cli/")) dependencies.push("@habitat-ai/cli");
  for (const name of dependencies) {
    // Resolve the actual package cohort, not a guessed Bun/Node installation layout.
    const packageJson = dependencyRequire.resolve(`${name}/package.json`);
    const target = join(input.outputRoot, "node_modules", name);
    await mkdir(dirname(target), { recursive: true });
    await symlink(dirname(packageJson), target, "junction");
    expect(await realpath(fixtureRequire.resolve(`${name}/package.json`))).toBe(
      await realpath(packageJson)
    );
  }
  for (const name of ["app.ts", "run.ts"]) {
    const source = await readFile(join(sources, name), "utf8");
    await writeFile(
      join(sourceRoot, name),
      source.replaceAll('"../../../dist/host.js"', JSON.stringify(input.hostImport))
    );
  }
  execFileSync(
    "bun",
    [
      "build",
      join(sourceRoot, "app.ts"),
      join(sourceRoot, "run.ts"),
      "--outdir",
      input.outputRoot,
      "--target",
      "node",
      "--packages",
      "external",
      "--splitting",
    ],
    { cwd: input.outputRoot, stdio: "pipe" }
  );
  await writeFile(
    join(input.outputRoot, "package.json"),
    JSON.stringify({
      name: "habitat-native-oclif-fixture",
      version: "1.0.0",
      type: "module",
      files: ["*.js"],
      engines: { node: ">=24" },
      oclif: {
        bin: "native-fixture",
        commands: { strategy: "explicit", target: "./app.js", identifier: "COMMANDS" },
        hooks: { finally: { target: "./app.js", identifier: "FINALLY_HOOK" } },
      },
    })
  );
  execFileSync(
    "bun",
    [
      "--bun",
      join(input.workspaceRoot, "node_modules/oclif/bin/run.js"),
      "manifest",
      input.outputRoot,
    ],
    {
      cwd: input.outputRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        HABITAT_FIXTURE_TRACE: join(input.outputRoot, "cold-events"),
        HABITAT_FIXTURE_DATA: input.outputRoot,
      },
      stdio: "pipe",
    }
  );
  expect(existsSync(join(input.outputRoot, "cold-events"))).toBe(false);
  expect(existsSync(join(input.outputRoot, "lease"))).toBe(false);
  const manifest = JSON.parse(
    await readFile(join(input.outputRoot, "oclif.manifest.json"), "utf8")
  );
  expect(Object.keys(manifest.commands)).toEqual(["probe"]);
  expect(manifest.commands.probe).toMatchObject({
    aliases: ["native-probe"],
    args: { mode: { required: true, options: ["success", "failure", "wait"] } },
    flags: { count: { type: "option" } },
  });
}

export const nativeRuntimeScenarios = [
  { name: "native parsing, alias and large output", mode: "success", exit: 0 },
  { name: "declared native failure", mode: "failure", exit: 2 },
  {
    name: "original failure survives finally failure",
    mode: "failure",
    exit: 2,
    finallyFails: true,
  },
  { name: "SIGINT native cleanup", mode: "wait", exit: 1, signal: "SIGINT" },
  { name: "SIGTERM native cleanup", mode: "wait", exit: 1, signal: "SIGTERM" },
  { name: "nonterminal successful capture", mode: "success", exit: 0, capture: true },
  { name: "nonterminal original rejection", mode: "failure", exit: 0, capture: true },
] as const satisfies readonly NativeRuntimeScenario[];

export interface NativeRuntimeScenario {
  readonly name: string;
  readonly mode: "success" | "failure" | "wait";
  readonly exit: number;
  readonly finallyFails?: boolean;
  readonly capture?: boolean;
  readonly signal?: "SIGINT" | "SIGTERM";
}

export async function verifyNativeRuntimeScenario(input: {
  readonly builtRoot: string;
  readonly dataRoot: string;
  readonly scenario: NativeRuntimeScenario;
}): Promise<void> {
  const { scenario } = input;
  const result = await runChild(input);
  expect(result.code, JSON.stringify(result)).toBe(scenario.exit);
  expect(result.signal).toBeNull();
  expect(result.leaseExists).toBe(false);
  const { catalog, selectedExecutionIds } = JSON.parse(
    await readFile(join(input.dataRoot, "ready-catalog.json"), "utf8")
  ) as { readonly catalog: RuntimeCatalog; readonly selectedExecutionIds: readonly string[] };
  expect(selectedExecutionIds).toHaveLength(1);
  expect(catalog.executionRegistry).toEqual({
    executionIds: selectedExecutionIds,
    status: "ready",
  });
  expect(catalog.executionPlans).toEqual([
    expect.objectContaining({
      executionId: selectedExecutionIds[0],
      boundary: "plugin.cli-command",
    }),
  ]);
  expect(catalog.surfaces).toEqual([
    expect.objectContaining({ surface: "cli/commands", executionIds: selectedExecutionIds }),
  ]);
  expect(catalog.lifecycleStatus).toMatchObject({
    provisioning: "ready",
    binding: "ready",
    adapters: "ready",
    mounting: "mounted",
    execution: "unobserved",
  });
  expect(catalog.harnesses).toEqual([
    expect.objectContaining({ harnessId: "native.oclif", mountStatus: "mounted" }),
  ]);
  expect(catalog.startupRecords.map(({ kind }) => kind)).toEqual([
    "provisioning.ready",
    "binding.ready",
    "adapters.ready",
    "harness.mounted",
    "process.started",
  ]);
  expect(catalog.startupRecords.find(({ kind }) => kind === "harness.mounted")).toMatchObject({
    harnessId: "native.oclif",
    surfacePlanIds: catalog.surfaces.map(({ surfacePlanId }) => surfacePlanId),
  });
  if (scenario.capture) {
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.events.slice(0, 7)).toEqual([
      "build",
      "acquire",
      "body",
      "finally.lease-open",
      "oclif.finally",
      "oclif.flush",
      "release",
    ]);
    expect(
      result.events.at(-1)?.startsWith(scenario.mode === "success" ? "captured:" : "rejected:")
    ).toBe(true);
    expect(result.events).not.toContain("present");
    expect(result.events).not.toContain("oclif.handle");
  } else if (scenario.mode === "success") {
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ count: 3, mode: "success" });
    expect(JSON.parse(result.stdout).output).toHaveLength(70_000);
    expect(result.events).toEqual([
      "build",
      "acquire",
      "body",
      "present",
      "finally.lease-open",
      "oclif.finally",
      "oclif.flush",
      "release",
    ]);
  } else if (scenario.mode === "failure") {
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("PRIMARY_COMMAND_FAILURE");
    expect(result.stderr).not.toContain("SECONDARY_FINALLY_FAILURE");
    expect(result.events).toEqual([
      "build",
      "acquire",
      "body",
      "finally.lease-open",
      "oclif.finally",
      "oclif.flush",
      "release",
      "oclif.handle",
    ]);
  } else {
    expect(result.events).toEqual([
      "build",
      "acquire",
      "body",
      "oclif.cancel",
      "effect.cleanup",
      "finally.lease-open",
      "oclif.finally",
      "oclif.flush",
      "release",
      "oclif.handle",
    ]);
  }
}

async function runChild(input: {
  readonly builtRoot: string;
  readonly dataRoot: string;
  readonly scenario: NativeRuntimeScenario;
}) {
  await mkdir(input.dataRoot, { recursive: true });
  const trace = join(input.dataRoot, "events");
  const { scenario } = input;
  const args = [scenario.mode === "success" ? "native-probe" : "probe", scenario.mode, "--count=3"];
  const child = spawn("node", [join(input.builtRoot, "run.js"), ...args], {
    cwd: input.builtRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      HABITAT_FIXTURE_DATA: input.dataRoot,
      HABITAT_FIXTURE_TRACE: trace,
      HABITAT_FIXTURE_FINALLY_FAIL: scenario.finallyFails ? "1" : "0",
      HABITAT_FIXTURE_CAPTURE: scenario.capture ? "1" : "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  let sent = false;
  const poll =
    scenario.signal === undefined
      ? undefined
      : setInterval(async () => {
          if (sent || !existsSync(trace)) return;
          if ((await readFile(trace, "utf8")).split("\n").includes("body")) {
            sent = true;
            child.kill(scenario.signal);
          }
        }, 5);
  const terminal = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Native Oclif child did not settle: ${stdout}\n${stderr}`));
      }, 10_000);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      });
    }
  ).finally(() => {
    if (poll !== undefined) clearInterval(poll);
  });
  const events = existsSync(trace) ? (await readFile(trace, "utf8")).trim().split("\n") : [];
  return {
    ...terminal,
    stdout,
    stderr,
    events,
    leaseExists: existsSync(join(input.dataRoot, "lease")),
  };
}
