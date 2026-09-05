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
  const extensionRoot = join(input.outputRoot, "node_modules/native-fixture-extension");
  await mkdir(extensionRoot, { recursive: true });
  await writeFile(
    join(extensionRoot, "package.json"),
    JSON.stringify({
      name: "native-fixture-extension",
      version: "1.0.0",
      type: "module",
      oclif: {
        commands: {
          strategy: "explicit",
          target: "./index.js",
          identifier: "COMMANDS",
        },
      },
    })
  );
  await writeFile(
    join(extensionRoot, "index.js"),
    [
      'import { Command } from "@oclif/core";',
      'import { record } from "../../app.js";',
      "class Outside extends Command {",
      '  static summary = "Native extension outside the Habitat source bundle";',
      "  async run() {",
      '    record("external.body");',
      '    this.log(JSON.stringify({ source: "native-extension" }));',
      "  }",
      "}",
      "export const COMMANDS = { outside: Outside };",
    ].join("\n")
  );
  await writeFile(
    join(input.outputRoot, "package.json"),
    JSON.stringify({
      name: "habitat-native-oclif-fixture",
      version: "1.0.0",
      type: "module",
      files: ["*.js"],
      engines: { node: ">=24" },
      dependencies: { "native-fixture-extension": "1.0.0" },
      oclif: {
        bin: "native-fixture",
        plugins: ["native-fixture-extension"],
        commands: {
          strategy: "explicit",
          target: "./app.js",
          identifier: "COMMANDS",
        },
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

const stdinText = ' \n{"message":"caf\u00e9"}\t\r\n ';

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
  {
    name: "nonterminal successful capture",
    mode: "success",
    exit: 0,
    capture: true,
  },
  {
    name: "nonterminal original rejection",
    mode: "failure",
    exit: 0,
    capture: true,
  },
  {
    name: "unknown native flag refuses before startup",
    mode: "success",
    argv: ["probe", "success", "--not-a-flag"],
    exit: 2,
    admission: "refused",
    expectedError: "Nonexistent flag",
  },
  {
    name: "native mode relationship refuses before startup",
    mode: "success",
    argv: ["probe", "success", "--operation=apply"],
    exit: 2,
    admission: "refused",
    expectedError: "All of the following must be provided",
  },
  {
    name: "valid native mode relationship parses and acquires once",
    mode: "success",
    argv: ["probe", "success", "--count=3", "--operation=apply", "--confirm"],
    exit: 0,
  },
  {
    name: "raw stdin bytes preserve whitespace and bypass the native global cache",
    mode: "success",
    argv: ["probe", "success", "--count=3", "--input=-"],
    stdin: [...Buffer.from(stdinText)],
    exit: 0,
  },
  {
    name: "malformed UTF-8 refuses before startup",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [0xff],
    exit: 2,
    admission: "refused",
    expectedError: "INVALID_STDIN_UTF8",
  },
  {
    name: "malformed JSON bytes refuse before startup",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [...Buffer.from('{"message":')],
    exit: 2,
    admission: "refused",
    expectedError: "INVALID_STDIN_JSON",
  },
  {
    name: "invalid payload shape refuses before startup",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [...Buffer.from('{"message":1}')],
    exit: 2,
    admission: "refused",
    expectedError: "INVALID_STDIN_PAYLOAD",
  },
  {
    name: "stdin limit counts bytes rather than decoded characters",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [...Buffer.from(JSON.stringify({ message: "\u00e9".repeat(64) }))],
    exit: 2,
    admission: "refused",
    expectedError: "STDIN_BYTE_LIMIT",
  },
  {
    name: "SIGINT during open byte stdin retains native pre-admission termination",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [...Buffer.from('{"message":')],
    stdinOpen: true,
    exit: null,
    signal: "SIGINT",
  },
  {
    name: "SIGTERM during open byte stdin retains native pre-admission termination",
    mode: "success",
    argv: ["probe", "success", "--input=-"],
    stdin: [...Buffer.from('{"message":')],
    stdinOpen: true,
    exit: null,
    signal: "SIGTERM",
  },
  {
    name: "native root help does not start Habitat",
    mode: "success",
    argv: ["--help"],
    exit: 0,
    admission: "help",
  },
  {
    name: "native command help does not parse or start Habitat",
    mode: "success",
    argv: ["probe", "--help"],
    exit: 0,
    admission: "help",
  },
  {
    name: "external native command does not start Habitat",
    mode: "success",
    argv: ["outside"],
    exit: 0,
    admission: "external",
  },
  {
    name: "later mount failure rolls back Oclif while its command awaits startup",
    mode: "success",
    exit: 1,
    gate: "mount-failure",
  },
  {
    name: "SIGINT during acquisition waits for settlement then refuses mount",
    mode: "success",
    exit: 1,
    gate: "acquire",
    signal: "SIGINT",
  },
  {
    name: "SIGTERM during acquisition waits for settlement then refuses mount",
    mode: "success",
    exit: 1,
    gate: "acquire",
    signal: "SIGTERM",
  },
] as const satisfies readonly NativeRuntimeScenario[];

export interface NativeRuntimeScenario {
  readonly name: string;
  readonly mode: "success" | "failure" | "wait";
  readonly exit: number | null;
  readonly argv?: readonly string[];
  readonly stdin?: readonly number[];
  readonly stdinOpen?: boolean;
  readonly admission?: "refused" | "help" | "external";
  readonly expectedError?: string;
  readonly gate?: "acquire" | "mount-failure";
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
  expect(result.leaseExists).toBe(false);
  if (scenario.stdinOpen) {
    expect(result.signal).toBe(scenario.signal);
    expect(result.events).toEqual(["parse", "stdin.read"]);
    expect(existsSync(join(input.dataRoot, "ready-catalog.json"))).toBe(false);
    expect(existsSync(join(input.dataRoot, "stdin-state.json"))).toBe(false);
    return;
  }
  expect(result.signal).toBeNull();
  expect(JSON.parse(await readFile(join(input.dataRoot, "stdin-state.json"), "utf8"))).toEqual({
    cacheUnchanged: true,
  });
  const parseCount = scenario.admission === "help" || scenario.admission === "external" ? 0 : 1;
  expect(result.events.filter((event) => event === "parse")).toHaveLength(parseCount);
  expect(result.events.filter((event) => event === "stdin.read")).toHaveLength(
    scenario.stdin === undefined ? 0 : 1
  );
  if (scenario.admission !== undefined) {
    expect(result.events).not.toContain("startup");
    expect(result.events).not.toContain("build");
    expect(result.events).not.toContain("acquire");
    expect(result.events).not.toContain("release");
    expect(result.events).not.toContain("body");
    expect(result.events.some((event) => event.startsWith("oclif."))).toBe(false);
    expect(existsSync(join(input.dataRoot, "ready-catalog.json"))).toBe(false);
    if (scenario.admission === "refused") {
      expect(result.stderr).toContain(scenario.expectedError);
      expect(result.events).toEqual([
        "parse",
        ...(scenario.stdin === undefined ? [] : ["stdin.read"]),
        "finally.no-lease",
      ]);
    } else if (scenario.admission === "help") {
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("USAGE");
    } else {
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({ source: "native-extension" });
      expect(result.events.filter((event) => event === "external.body")).toHaveLength(1);
    }
    return;
  }
  expect(result.events.filter((event) => event === "startup")).toHaveLength(1);
  expect(result.events.filter((event) => event === "build")).toHaveLength(1);
  expect(result.events.filter((event) => event === "acquire")).toHaveLength(1);
  expect(result.events.filter((event) => event === "release")).toHaveLength(1);
  if (scenario.gate !== undefined) {
    expect(result.gated).toMatchObject({
      alive: true,
      leaseExists: scenario.gate === "mount-failure",
    });
    expect(result.gated?.events).not.toContain("gate.open");
    expect(result.gated?.events).not.toContain("release");
    expect(result.gated?.events).not.toContain("body");
    expect(result.events.some((event) => event.startsWith("oclif."))).toBe(false);
    expect(existsSync(join(input.dataRoot, "ready-catalog.json"))).toBe(false);
    expect(result.stdout).toBe("");
    if (scenario.gate === "mount-failure") {
      expect(result.stderr).toContain("STARTUP_MOUNT_FAILURE");
      expect(result.events).toEqual([
        "parse",
        "startup",
        "build",
        "acquire",
        "native.mounted",
        "gate.wait",
        "gate.open",
        "startup.fail",
        "native.stop",
        "native.stopped",
        "release",
        "finally.no-lease",
      ]);
    } else {
      expect(result.gated?.events).toContain("signal.received");
      expect(result.gated?.events).not.toContain("acquire");
      expect(result.events).toEqual([
        "parse",
        "startup",
        "build",
        "gate.wait",
        "signal.received",
        "gate.open",
        "acquire",
        "release",
        "finally.no-lease",
      ]);
    }
    return;
  }
  const { catalog, selectedExecutionIds } = JSON.parse(
    await readFile(join(input.dataRoot, "ready-catalog.json"), "utf8")
  ) as {
    readonly catalog: RuntimeCatalog;
    readonly selectedExecutionIds: readonly string[];
  };
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
  const admissionEvents = [
    "parse",
    ...(scenario.stdin === undefined ? [] : ["stdin.read"]),
    "startup",
    "build",
    "acquire",
  ];
  if (scenario.capture) {
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.events.slice(0, -1)).toEqual([
      ...admissionEvents,
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
    expect(JSON.parse(result.stdout)).toMatchObject({
      count: 3,
      mode: "success",
    });
    expect(JSON.parse(result.stdout).output).toHaveLength(70_000);
    expect(JSON.parse(result.stdout).operation).toBe(
      scenario.argv?.includes("--operation=apply") ? "apply" : "inspect"
    );
    if (scenario.stdin !== undefined) {
      const bytes = Buffer.from(scenario.stdin);
      expect(JSON.parse(result.stdout).input).toEqual({
        message: "caf\u00e9",
        byteLength: bytes.length,
        hex: bytes.toString("hex"),
      });
      expect(bytes.toString("utf8")).not.toBe(bytes.toString("utf8").trim());
    }
    expect(result.events).toEqual([
      ...admissionEvents,
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
      ...admissionEvents,
      "body",
      "finally.lease-open",
      "oclif.finally",
      "oclif.flush",
      "release",
      "oclif.handle",
    ]);
  } else {
    expect(result.events).toEqual([
      ...admissionEvents,
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
  const args = scenario.argv ?? [
    scenario.mode === "success" ? "native-probe" : "probe",
    scenario.mode,
    "--count=3",
  ];
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
      HABITAT_FIXTURE_ACQUIRE_GATE: scenario.gate === "acquire" ? "1" : "0",
      HABITAT_FIXTURE_STARTUP_FAIL: scenario.gate === "mount-failure" ? "1" : "0",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const stdin = scenario.stdin === undefined ? undefined : Buffer.from(scenario.stdin);
  if (scenario.stdinOpen) child.stdin.write(stdin!);
  else child.stdin.end(stdin);
  let closed = false;
  const nativeClose = new Promise<void>((resolve) => {
    child.once("close", () => {
      closed = true;
      resolve();
    });
  });
  const terminal = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    const timer = setTimeout(() => {
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
  });
  const readEvents = async () =>
    existsSync(trace) ? (await readFile(trace, "utf8")).trim().split("\n") : [];
  const waitForEvent = async (event: string) => {
    while (!(await readEvents()).includes(event)) {
      if (closed) throw new Error(`Native Oclif child settled before ${event}: ${stderr}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };
  let gated:
    | {
        readonly alive: boolean;
        readonly leaseExists: boolean;
        readonly events: readonly string[];
      }
    | undefined;
  const drive = async () => {
    if (scenario.gate !== undefined) {
      await waitForEvent("gate.wait");
      if (scenario.signal !== undefined) {
        child.kill(scenario.signal);
        await waitForEvent("signal.received");
      }
      // Let cancellation run while acquisition remains suspended; it cannot release yet.
      await new Promise((resolve) => setTimeout(resolve, 25));
      gated = {
        alive: !closed,
        leaseExists: existsSync(join(input.dataRoot, "lease")),
        events: await readEvents(),
      };
      await writeFile(join(input.dataRoot, "gate-open"), "open");
    } else if (scenario.signal !== undefined) {
      await waitForEvent(scenario.stdinOpen ? "stdin.read" : "body");
      child.kill(scenario.signal);
    }
  };
  const driving = drive();
  const [result] = await Promise.all([terminal, driving]).catch(async (error) => {
    if (!closed) child.kill("SIGKILL");
    await nativeClose;
    await driving.catch(() => undefined);
    throw error;
  });
  const events = await readEvents();
  return {
    ...result,
    stdout,
    stderr,
    events,
    gated,
    leaseExists: existsSync(join(input.dataRoot, "lease")),
  };
}
