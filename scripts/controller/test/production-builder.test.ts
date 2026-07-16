import { afterEach, describe, expect, it } from "bun:test";
import { watch } from "node:fs";
import {
  chmod,
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  controllerCommandPackages,
} from "../../../apps/cli/src/lib/controller/classification.ts";
import { buildControllerRelease } from "../build-release.ts";
import {
  formatProductionControllerResult,
  isProductionControllerResultHealthy,
  parseProductionControllerCliOptions,
} from "../cli-build-production.ts";
import {
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerLauncherPath,
  controllerSelectorPath,
} from "../layout.ts";
import { installStableControllerLauncher } from "../install-launcher.ts";
import {
  createNodeControllerSelectorStore,
  type ControllerSelectorStore,
} from "../selector-store.ts";
import {
  activateProductionController,
  probeControllerCleanStart,
} from "../production/activation.ts";
import { finalizeWithStableSourceRevision } from "../production/builder.ts";
import {
  assertProductionDependencyClosure,
  loadProductionDependencies,
} from "../production/dependencies.ts";
import { installGlobalControllerAlias } from "../production/global-alias.ts";
import { createExactPayloadSourcePlan } from "../production/payload.ts";
import { runCommand, type CommandRunner } from "../production/process.ts";
import {
  createRuntimePackageManifest,
  writeProductionAppManifest,
} from "../production/runtime-package.ts";
import { requireVerifiedOfficialControllerRelease } from "../production/verify-official.ts";

const roots: string[] = [];

type FilesystemSnapshotEntry = Readonly<{
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
  mode: number;
  inode: number;
  links: number;
  size: number;
  modifiedNs: bigint;
  bytes?: string;
  target?: string;
}>;

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })));
});

async function temporaryRoot(label: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `rawr-controller-${label}-`));
  roots.push(root);
  return root;
}

async function snapshotFilesystem(root: string): Promise<readonly FilesystemSnapshotEntry[]> {
  const entries: FilesystemSnapshotEntry[] = [];
  const visit = async (entryPath: string, relativePath: string): Promise<void> => {
    const status = await lstat(entryPath);
    const common = {
      path: relativePath,
      mode: status.mode,
      inode: status.ino,
      links: status.nlink,
      size: status.size,
      modifiedNs: status.mtimeNs,
    };
    if (status.isDirectory()) {
      entries.push(Object.freeze({ ...common, kind: "directory" }));
      const children = await readdir(entryPath);
      children.sort();
      for (const child of children) {
        await visit(join(entryPath, child), relativePath === "." ? child : join(relativePath, child));
      }
      return;
    }
    if (status.isFile()) {
      entries.push(Object.freeze({
        ...common,
        kind: "file",
        bytes: Buffer.from(await readFile(entryPath)).toString("base64"),
      }));
      return;
    }
    if (status.isSymbolicLink()) {
      entries.push(Object.freeze({ ...common, kind: "symlink", target: await readlink(entryPath) }));
      return;
    }
    entries.push(Object.freeze({ ...common, kind: "other" }));
  };
  await visit(root, ".");
  return Object.freeze(entries);
}

describe("production controller dependency boundary", () => {
  it("pins the external runtime closure and excludes protected Inngest bytes", async () => {
    const dependencies = await loadProductionDependencies();
    expect(dependencies.inngest).toBeUndefined();
    expect(dependencies["@oclif/plugin-plugins"]).toBe("5.4.56");
    expect(Object.values(dependencies).every((version) => !version.startsWith("^") && !version.startsWith("~"))).toBe(true);
  });

  it("rejects protected and missing workspace dependencies before staging", async () => {
    const workspaceRoot = await temporaryRoot("dependency-closure");
    await copyFile(
      resolve(import.meta.dir, "../../..", "bun.lock"),
      join(workspaceRoot, "bun.lock"),
    );
    const protectedRoot = join(workspaceRoot, "plugins", "agents", "fixture");
    await mkdir(protectedRoot, { recursive: true });
    await writeFile(
      join(protectedRoot, "package.json"),
      JSON.stringify({ name: "@fixture/protected", dependencies: {} }),
    );
    await expect(
      assertProductionDependencyClosure({
        workspaceRoot,
        projects: [{ name: "@fixture/protected", root: "plugins/agents/fixture" }],
      }),
    ).rejects.toThrow("protected project entered production controller closure");
  });
});

describe("production source provenance", () => {
  it("waits for inherited subprocess pipes to close before returning captured output", async () => {
    const cwd = await temporaryRoot("runner-close");
    const result = await runCommand(process.execPath, [
      "-e",
      [
        'const { spawn } = require("node:child_process");',
        'const child = spawn(process.execPath, ["-e", "setTimeout(() => process.stdout.write(\\"late\\"), 30)"], { stdio: ["ignore", "inherit", "inherit"] });',
        "child.unref();",
        'process.stdout.write("early:");',
      ].join("\n"),
    ], { cwd });

    expect(result.stdout).toBe("early:late");
  });

  it("refuses final materialization when the clean source revision changes", async () => {
    const expectedRevision = "a".repeat(40);
    const observedRevision = "b".repeat(40);
    let finalized = false;
    const runner: CommandRunner = async (executable, args) => {
      expect(executable).toBe("git");
      if (args[0] === "status") return Object.freeze({ stdout: "", stderr: "" });
      if (args[0] === "rev-parse") {
        return Object.freeze({ stdout: `${observedRevision}\n`, stderr: "" });
      }
      throw new Error(`unexpected command: ${args.join(" ")}`);
    };

    await expect(
      finalizeWithStableSourceRevision({
        workspaceRoot: "/fixture/workspace",
        expectedRevision,
        runner,
        finalize: async () => {
          finalized = true;
          return "materialized";
        },
      }),
    ).rejects.toThrow(
      `production controller source changed during build: expected ${expectedRevision}, received ${observedRevision}`,
    );
    expect(finalized).toBe(false);
  });

  it("permits final materialization only after the same clean revision is re-observed", async () => {
    const expectedRevision = "c".repeat(40);
    const runner: CommandRunner = async (_executable, args) => {
      if (args[0] === "status") return Object.freeze({ stdout: "", stderr: "" });
      return Object.freeze({ stdout: `${expectedRevision}\n`, stderr: "" });
    };

    await expect(
      finalizeWithStableSourceRevision({
        workspaceRoot: "/fixture/workspace",
        expectedRevision,
        runner,
        finalize: async () => "materialized",
      }),
    ).resolves.toBe("materialized");
  });
});

describe("production runtime package staging", () => {
  it("maps source exports and command roots only to emitted output", async () => {
    const sourceRoot = await temporaryRoot("runtime-package");
    await mkdir(join(sourceRoot, "dist", "commands"), { recursive: true });
    await writeFile(join(sourceRoot, "dist", "index.js"), "export const value = 1;\n");
    await writeFile(join(sourceRoot, "dist", "commands", "hello.js"), "export default class Hello {}\n");
    await writeFile(
      join(sourceRoot, "package.json"),
      JSON.stringify({
        name: "@fixture/runtime",
        type: "module",
        main: "./src/index.ts",
        exports: { ".": { types: "./src/index.ts", default: "./src/index.ts" } },
        dependencies: { "@fixture/internal": "workspace:*", inngest: "3.51.0", zod: "3.25.76" },
        oclif: { commands: "./src/commands", topicSeparator: " ", typescript: { commands: "./src/commands" } },
      }),
    );
    const manifest = await createRuntimePackageManifest({
      sourceRoot,
      sourceRevision: "a".repeat(40),
      closurePackageVersions: new Map([
        ["@fixture/runtime", `0.0.0-source.${"a".repeat(12)}`],
        ["@fixture/internal", "2.0.0"],
      ]),
    });
    expect(manifest.main).toBe("./dist/index.js");
    expect(manifest.exports).toEqual({ ".": "./dist/index.js" });
    expect(manifest.oclif).toEqual({ topicSeparator: " ", commands: "./dist/commands" });
    expect(manifest.dependencies).toEqual({
      "@fixture/internal": "2.0.0",
      zod: "3.25.76",
    });
  });

  it("replaces the install-only manifest with the RAWR application composition", async () => {
    const appRoot = await temporaryRoot("production-app");
    await writeFile(
      join(appRoot, "package.json"),
      JSON.stringify({
        name: "@rawr/controller-production-dependencies",
        dependencies: { "@oclif/core": "4.8.0" },
      }),
    );
    const manifest = await writeProductionAppManifest({ appRoot, cliVersion: "1.2.3" });
    expect(manifest).toEqual({
      name: "rawr",
      private: true,
      version: "1.2.3",
      type: "module",
      dependencies: { "@oclif/core": "4.8.0", "@rawr/cli": "1.2.3" },
      oclif: { bin: "rawr", topicSeparator: " ", plugins: ["@rawr/cli"] },
    });
  });
});

describe("production payload inventory", () => {
  it("rejects hardlinks and links outside the staged payload", async () => {
    const root = await temporaryRoot("payload-inventory");
    await writeFile(join(root, "one"), "one");
    await link(join(root, "one"), join(root, "two"));
    await expect(createExactPayloadSourcePlan(root)).rejects.toThrow("shared inode");

    await rm(join(root, "two"));
    await rm(join(root, "one"));
    const outside = join(dirname(root), `${root.split("/").at(-1)}-outside`);
    await writeFile(outside, "outside");
    try {
      await symlink(outside, join(root, "escape"));
      await expect(createExactPayloadSourcePlan(root)).rejects.toThrow("escapes staging root");
    } finally {
      await rm(outside, { force: true });
    }
  });
});

describe("global stable controller alias", () => {
  it("does not rewrite an exact converged alias", async () => {
    const root = await temporaryRoot("global-alias");
    const launcher = join(root, "data", "controller", "bin", "rawr");
    const bin = join(root, "bin");
    await mkdir(dirname(launcher), { recursive: true });
    await writeFile(launcher, "#!/bin/sh\n", { mode: 0o755 });
    const first = await installGlobalControllerAlias({ globalBinDir: bin, launcherPath: launcher });
    const before = await lstat(first.path);
    const second = await installGlobalControllerAlias({ globalBinDir: bin, launcherPath: launcher });
    const after = await lstat(second.path);
    expect(first.kind).toBe("installed");
    expect(second.kind).toBe("converged");
    expect(await readlink(second.path)).toBe(launcher);
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeNs).toBe(before.mtimeNs);
  });

  it("reports an alias committed with unconfirmed directory durability", async () => {
    const root = await temporaryRoot("global-alias-unconfirmed");
    const launcher = join(root, "data", "controller", "bin", "rawr");
    const bin = join(root, "bin");
    await mkdir(dirname(launcher), { recursive: true });
    await writeFile(launcher, "#!/bin/sh\n", { mode: 0o755 });

    const result = await installGlobalControllerAlias({
      globalBinDir: bin,
      launcherPath: launcher,
      observe: (phase) => {
        if (phase === "after-replace") throw new Error("fixture alias directory fsync failure");
      },
    });

    expect(result).toMatchObject({
      kind: "installed",
      durability: "unconfirmed",
      postCommitError: "fixture alias directory fsync failure",
    });
    expect(await readlink(join(bin, "rawr"))).toBe(launcher);
  });

  it("refuses to overwrite an unrelated regular global command", async () => {
    const root = await temporaryRoot("global-alias-file");
    const launcher = join(root, "data", "controller", "bin", "rawr");
    const bin = join(root, "bin");
    await mkdir(dirname(launcher), { recursive: true });
    await mkdir(bin, { recursive: true });
    await writeFile(launcher, "#!/bin/sh\n", { mode: 0o755 });
    await writeFile(join(bin, "rawr"), "unrelated\n", { mode: 0o755 });
    await expect(
      installGlobalControllerAlias({ globalBinDir: bin, launcherPath: launcher }),
    ).rejects.toThrow("not a replaceable symlink");
    expect(await readFile(join(bin, "rawr"), "utf8")).toBe("unrelated\n");
  });

  it("preserves both alias preparation and temporary-cleanup failures", async () => {
    const globalBinDir = await temporaryRoot("global-alias-primary-and-cleanup");
    let observed: unknown;

    try {
      await installGlobalControllerAlias({
        globalBinDir,
        launcherPath: "/controller/bin/rawr",
        observe: async (phase) => {
          if (phase !== "before-replace") return;
          const temporaryName = (await readdir(globalBinDir)).find((name) => name.startsWith("rawr.tmp-"));
          if (temporaryName === undefined) throw new Error("fixture alias temporary missing");
          const temporaryPath = join(globalBinDir, temporaryName);
          await rm(temporaryPath);
          await mkdir(temporaryPath);
          throw new Error("fixture alias primary failure");
        },
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(AggregateError);
    expect((observed as AggregateError).errors.map(String).join("\n")).toContain(
      "fixture alias primary failure",
    );
    expect((observed as AggregateError).errors).toHaveLength(2);
  });
});

async function writeSemanticPackage(options: {
  appRoot: string;
  packageId: string;
  commandId?: string;
  manager?: boolean;
  cliPlugins?: readonly string[];
}): Promise<{
  version: string;
  root: string;
  actualCommandId: string | null;
}> {
  const version = "1.0.0";
  const root = join(options.appRoot, "node_modules", options.packageId);
  await mkdir(root, { recursive: true });
  if (options.manager) {
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: options.packageId,
        version,
        type: "module",
        exports: "./lib/index.js",
        oclif: { hooks: { update: "./lib/update.js" } },
      }),
    );
    await mkdir(join(root, "lib"), { recursive: true });
    await writeFile(join(root, "lib", "index.js"), "export {};\n");
    await writeFile(join(root, "lib", "update.js"), "export default async function update() {}\n");
    return { version, root, actualCommandId: null };
  }
  const commandId = options.commandId!;
  const modulePath = ["dist", "commands", `${commandId.replaceAll(":", "-")}.js`];
  await mkdir(join(root, "dist", "commands"), { recursive: true });
  await writeFile(join(root, ...modulePath), "export default class FixtureCommand {}\n");
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: options.packageId,
      version,
      type: "module",
      oclif: {
        commands: "./dist/commands",
        ...(options.packageId === "@rawr/cli"
          ? {
              plugins: options.cliPlugins ?? controllerCommandPackages
                .filter((row) => row.disposition === "controller-member" && row.discoverCommands && row.packageId !== "@rawr/cli")
                .map((row) => row.packageId),
            }
          : {}),
      },
    }),
  );
  await writeFile(
    join(root, "oclif.manifest.json"),
    JSON.stringify({
      version,
      commands: {
        [commandId]: {
          id: commandId,
          aliases: [],
          hiddenAliases: [],
          relativePath: modulePath,
        },
      },
    }),
  );
  return { version, root, actualCommandId: commandId };
}

async function buildSemanticFixture(options: {
  mismatch?: boolean;
  compositionPlugins?: readonly string[];
  dataRoot?: string;
  sourceRevision?: string;
  platform?: "darwin" | "linux";
  architecture?: "arm64" | "x64";
  excludedPackageId?: string;
} = {}): Promise<{
  releaseRoot: string;
  controllerDigest: string;
  workspaceRoot: string;
}> {
  const workspaceRoot = await temporaryRoot("semantic-workspace");
  const payloadRoot = join(workspaceRoot, "payload");
  const appRoot = join(payloadRoot, "app");
  await mkdir(join(payloadRoot, "runtime"), { recursive: true });
  await mkdir(appRoot, { recursive: true });
  await writeFile(join(payloadRoot, "runtime", "bun"), "fixture runtime\n", { mode: 0o755 });
  await chmod(join(payloadRoot, "runtime", "bun"), 0o755);
  await writeFile(join(payloadRoot, "runtime", "LICENSE.txt"), "fixture license\n");
  await writeFile(join(appRoot, "rawr.mjs"), "export {};\n");
  const members = [];
  let commandIndex = 0;
  const memberRows = controllerCommandPackages.filter(
    (row) => row.disposition === "controller-member" && row.packageId !== options.excludedPackageId,
  );
  const cliPlugins = memberRows
    .filter((row) => row.discoverCommands && row.packageId !== "@rawr/cli")
    .map((row) => row.packageId);
  for (const row of memberRows) {
    if (!row.discoverCommands) {
      const staged = await writeSemanticPackage({ appRoot, packageId: row.packageId, manager: true });
      members.push({
        packageId: row.packageId,
        version: staged.version,
        role: "native-manager" as const,
        root: `app/node_modules/${row.packageId}`,
        commandIds: [],
        topics: [],
        aliases: [],
        hiddenAliases: [],
        hooks: ["update"],
      });
      continue;
    }
    const actualCommandId = `fixture${commandIndex}:command`;
    commandIndex += 1;
    const staged = await writeSemanticPackage({
      appRoot,
      packageId: row.packageId,
      commandId: actualCommandId,
      cliPlugins,
    });
    const declaredCommandId = options.mismatch === true && row.packageId === "@rawr/plugin-devops"
      ? "fixture-mismatch:command"
      : actualCommandId;
    members.push({
      packageId: row.packageId,
      version: staged.version,
      role: "command" as const,
      root: `app/node_modules/${row.packageId}`,
      commandIds: [declaredCommandId],
      topics: [declaredCommandId.split(":")[0]!],
      aliases: [],
      hiddenAliases: [],
      hooks: [],
    });
  }
  await writeFile(
    join(appRoot, "package.json"),
    JSON.stringify({
      name: "rawr",
      private: true,
      version: "1.0.0",
      type: "module",
      dependencies: { "@rawr/cli": "1.0.0" },
      oclif: {
        bin: "rawr",
        topicSeparator: " ",
        plugins: options.compositionPlugins ?? ["@rawr/cli"],
      },
    }),
  );
  const lockPathInput = join(workspaceRoot, "bun.lock");
  await writeFile(lockPathInput, "fixture lock\n");
  const lockPath = await realpath(lockPathInput);
  const sources = await createExactPayloadSourcePlan(payloadRoot);
  const dataRoot = options.dataRoot ?? join(workspaceRoot, "data");
  const built = await buildControllerRelease({
    dataRoot,
    workspaceRoot,
    allowedSourceRoots: [await realpath(payloadRoot), await realpath(workspaceRoot)],
    sourceRevision: options.sourceRevision ?? "a".repeat(40),
    dependencyLockPath: lockPath,
    runtime: {
      version: "1.3.14",
      revision: "b".repeat(40),
      platform: options.platform ?? (process.platform === "linux" ? "linux" : "darwin"),
      architecture: options.architecture ?? (process.arch === "x64" ? "x64" : "arm64"),
    },
    officialMembers: members,
    buildInterfaces: [{ name: "fixture", version: "1" }],
    nxGraph: {
      graph: {
        nodes: { fixture: { name: "fixture", data: { root: "fixture" } } },
        dependencies: { fixture: [] },
      },
    },
    nxRootProjectNames: ["fixture"],
    sources,
  });
  return {
    releaseRoot: built.releaseRoot,
    controllerDigest: built.controllerDigest,
    workspaceRoot,
  };
}

describe("official static surface verification", () => {
  it("accepts package bytes whose generated static surfaces equal the release manifest", async () => {
    const fixture = await buildSemanticFixture();
    const verified = await requireVerifiedOfficialControllerRelease({
      releaseRoot: fixture.releaseRoot,
      expectedDigest: fixture.controllerDigest,
    });
    expect(verified.status).toBe("verified");
  });

  it("rejects a self-consistent release whose declared command differs from static package bytes", async () => {
    const fixture = await buildSemanticFixture({ mismatch: true });
    await expect(
      requireVerifiedOfficialControllerRelease({
        releaseRoot: fixture.releaseRoot,
        expectedDigest: fixture.controllerDigest,
      }),
    ).rejects.toThrow("CONTROLLER_OFFICIAL_SURFACE_MISMATCH");
  });

  it("rejects a self-consistent release whose Config root adds a discovery path", async () => {
    const fixture = await buildSemanticFixture({
      compositionPlugins: ["@rawr/cli", "@rawr/plugin-devops"],
    });
    await expect(
      requireVerifiedOfficialControllerRelease({
        releaseRoot: fixture.releaseRoot,
        expectedDigest: fixture.controllerDigest,
      }),
    ).rejects.toThrow("CONTROLLER_OFFICIAL_SURFACE_MISMATCH: production app composition");
  });
});

function cleanStartProbeRunner(
  calls: Array<Readonly<{ digest: string; argv: readonly string[] }>>,
  fail?: Readonly<{ digest: string; argv: readonly string[] }>,
): CommandRunner {
  return async (executable, args, options) => {
    const environment = options.env;
    const digest = environment?.RAWR_CONTROLLER_DIGEST;
    const releaseRoot = environment?.RAWR_CONTROLLER_RELEASE_ROOT;
    const operatorCwd = environment?.RAWR_OPERATOR_CWD;
    if (digest === undefined || releaseRoot === undefined || operatorCwd === undefined) {
      throw new Error("clean-start probe context missing");
    }
    expect(executable).toBe(join(releaseRoot, CONTROLLER_RUNTIME_PATH));
    expect(args.slice(0, 3)).toEqual([
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
    ]);
    for (const name of [
      "BUN_CONFIG",
      "BUN_INSTALL",
      "BUN_INSTALL_CACHE_DIR",
      "BUN_OPTIONS",
      "BUN_PRELOAD",
      "BUN_WORKSPACE",
      "NODE_OPTIONS",
      "NODE_PATH",
      "RAWR_HOSTILE_ENV",
    ]) {
      expect(environment?.[name]).toBeUndefined();
    }
    expect(environment?.HOME).toBe("/dev/null");
    expect(environment?.XDG_CONFIG_HOME).toBe("/dev/null");
    expect(await readFile(join(operatorCwd, "bunfig.toml"), "utf8")).toContain("preload");
    expect(await readFile(join(operatorCwd, ".env"), "utf8")).toContain("RAWR_HOSTILE_ENV");
    const ambientEnvironmentProbe = args[3] === "-e";
    if (ambientEnvironmentProbe) {
      expect(options.cwd).toBe(operatorCwd);
      expect(args[4]).toContain("RAWR_HOSTILE_ENV");
    } else {
      expect(options.cwd).toBe(releaseRoot);
      expect(args[3]).toBe(join(releaseRoot, CONTROLLER_ENTRY_PATH));
    }
    const command = ambientEnvironmentProbe ? ["ambient-env"] : args.slice(4);
    calls.push(Object.freeze({ digest, argv: Object.freeze([...command]) }));
    if (fail?.digest === digest && JSON.stringify(fail.argv) === JSON.stringify(command)) {
      throw new Error("fixture clean-start failure");
    }
    return Object.freeze({ stdout: "", stderr: "" });
  };
}

describe("production controller activation", () => {
  it("reports a launcher committed with unconfirmed directory durability", async () => {
    const dataRoot = await temporaryRoot("launcher-unconfirmed");
    const sourcePath = join(await temporaryRoot("launcher-source"), "rawr");
    await writeFile(sourcePath, "#!/bin/sh\nexit 0\n", { mode: 0o755 });

    const result = await installStableControllerLauncher({
      dataRoot,
      sourcePath,
      observe: (phase) => {
        if (phase === "after-replace") throw new Error("fixture launcher directory fsync failure");
      },
    });

    expect(result).toMatchObject({
      kind: "installed",
      durability: "unconfirmed",
      postCommitError: "fixture launcher directory fsync failure",
    });
    expect(await readFile(result.path, "utf8")).toBe("#!/bin/sh\nexit 0\n");
  });

  it("runs the hostile dotenv and preload oracle in a real isolated Bun process", async () => {
    const dataRoot = await temporaryRoot("activation-real-probe");
    const releaseRoot = join(dataRoot, "fixture-release");
    await mkdir(join(releaseRoot, "runtime"), { recursive: true });
    await mkdir(join(releaseRoot, "app"), { recursive: true });
    await symlink(process.execPath, join(releaseRoot, CONTROLLER_RUNTIME_PATH));
    await writeFile(
      join(releaseRoot, CONTROLLER_ENTRY_PATH),
      'if (process.env.RAWR_HOSTILE_ENV !== undefined) throw new Error("hostile dotenv loaded");\n',
    );

    await probeControllerCleanStart({
      dataRoot,
      controllerDigest: "e".repeat(64),
      releaseRoot,
      runner: runCommand,
    });
  });

  it("preserves both clean-start failure and guarded probe cleanup failure", async () => {
    const dataRoot = await temporaryRoot("activation-probe-dual-failure-data");
    const releaseRoot = await temporaryRoot("activation-probe-dual-failure-release");
    let probeRoot: string | undefined;
    let movedProbeRoot: string | undefined;
    let observed: unknown;

    try {
      await probeControllerCleanStart({
        dataRoot,
        controllerDigest: "e".repeat(64),
        releaseRoot,
        runner: async (_executable, _args, options) => {
          probeRoot = dirname(options.cwd);
          movedProbeRoot = `${probeRoot}-moved`;
          await rename(probeRoot, movedProbeRoot);
          await symlink(movedProbeRoot, probeRoot);
          throw new Error("fixture clean-start primary failure");
        },
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(AggregateError);
    const errors = (observed as AggregateError).errors.map(String).join("\n");
    expect(errors).toContain("CONTROLLER_CLEAN_START_FAILED:ambient-env");
    expect(errors).toContain("refusing to remove invalid controller activation probe root");
    if (probeRoot !== undefined) await rm(probeRoot, { force: true });
    if (movedProbeRoot !== undefined) roots.push(movedProbeRoot);
  });

  it("requires an explicit digest for activate and does not admit build-only options", async () => {
    const dataRoot = await temporaryRoot("activation-options");
    const digest = "d".repeat(64);
    const options = await parseProductionControllerCliOptions([
      "activate",
      digest,
      "--data-root",
      dataRoot,
      "--no-global-alias",
      "--json",
    ]);
    expect(options).toEqual({
      operation: "activate",
      controllerDigest: digest,
      dataRoot,
      globalBinDir: null,
      json: true,
    });
    await expect(
      parseProductionControllerCliOptions([
        "activate",
        "--data-root",
        dataRoot,
        "--no-global-alias",
      ]),
    ).rejects.toThrow("activate requires an existing controller digest");
    await expect(
      parseProductionControllerCliOptions([
        "activate",
        digest,
        "--data-root",
        dataRoot,
        "--no-global-alias",
        "--bun-binary",
        process.execPath,
      ]),
    ).rejects.toThrow("valid only for production controller install");
  });

  it("upgrades from and rolls back to a self-owned release whose member set differs from current classification", async () => {
    const dataRoot = await temporaryRoot("activation-existing-releases");
    const releaseA = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "a".repeat(40),
      excludedPackageId: "@rawr/plugin-devops",
    });
    const releaseB = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "b".repeat(40),
    });
    const calls: Array<Readonly<{ digest: string; argv: readonly string[] }>> = [];
    const runner = cleanStartProbeRunner(calls);

    const selectedA = await activateProductionController({
      dataRoot,
      controllerDigest: releaseA.controllerDigest,
      commandRunner: runner,
    });
    const selectedB = await activateProductionController({
      dataRoot,
      controllerDigest: releaseB.controllerDigest,
      commandRunner: runner,
    });
    await Promise.all([
      rm(releaseA.workspaceRoot, { recursive: true, force: true }),
      rm(releaseB.workspaceRoot, { recursive: true, force: true }),
    ]);
    const reselectedA = await activateProductionController({
      dataRoot,
      controllerDigest: releaseA.controllerDigest,
      commandRunner: runner,
    });

    expect(selectedA.activation).toMatchObject({
      kind: "activated",
      replaced: "missing",
      selectorDurability: "confirmed",
    });
    expect(selectedB.activation).toMatchObject({
      kind: "activated",
      replaced: "different",
      selectorDurability: "confirmed",
    });
    expect(reselectedA.activation).toMatchObject({
      kind: "activated",
      replaced: "different",
      selectorDurability: "confirmed",
    });
    expect(await readFile(controllerSelectorPath(dataRoot), "utf8")).toBe(
      `${releaseA.controllerDigest}\n`,
    );
    expect(calls.map((call) => call.argv)).toEqual([
      ["ambient-env"],
      ["--version"],
      ["--help"],
      ["plugins", "list"],
      ["ambient-env"],
      ["--version"],
      ["--help"],
      ["plugins", "list"],
      ["ambient-env"],
      ["--version"],
      ["--help"],
      ["plugins", "list"],
    ]);
    expect(calls.map((call) => call.digest)).toEqual([
      ...Array(4).fill(releaseA.controllerDigest),
      ...Array(4).fill(releaseB.controllerDigest),
      ...Array(4).fill(releaseA.controllerDigest),
    ]);
    expect(formatProductionControllerResult(reselectedA)).toContain(
      "replaced different, durability confirmed",
    );
    expect(JSON.parse(JSON.stringify(reselectedA))).toMatchObject({
      activation: {
        replaced: "different",
        selectorDurability: "confirmed",
      },
    });
  });

  it("performs no filesystem mutation or clean-start probe when production activation is converged", async () => {
    const dataRoot = await temporaryRoot("activation-converged");
    const globalBinDir = await temporaryRoot("activation-converged-bin");
    const release = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "e".repeat(40),
    });
    await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: cleanStartProbeRunner([]),
    });
    const before = await snapshotFilesystem(dataRoot);
    const beforeGlobalBin = await snapshotFilesystem(globalBinDir);
    const probeEvents: string[] = [];
    const temporaryRootPath = await realpath(tmpdir());
    const watcher = watch(temporaryRootPath, (_event, filename) => {
      const observed = filename?.toString();
      if (observed?.startsWith("rawr-controller-activation-probe-")) {
        probeEvents.push(observed);
      }
    });
    let runnerCalls = 0;
    try {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
      const converged = await activateProductionController({
        dataRoot,
        controllerDigest: release.controllerDigest,
        globalBinDir,
        commandRunner: async () => {
          runnerCalls += 1;
          throw new Error("converged activation must not run a clean-start probe");
        },
      });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));

      expect(converged).toMatchObject({
        launcher: { kind: "converged" },
        activation: {
          kind: "converged",
          replaced: null,
          selectorDurability: "unchanged",
        },
        globalAlias: { kind: "converged", durability: "unchanged" },
      });
      expect(isProductionControllerResultHealthy(converged)).toBe(true);
    } finally {
      watcher.close();
    }

    expect(runnerCalls).toBe(0);
    expect(probeEvents).toEqual([]);
    expect(await snapshotFilesystem(dataRoot)).toEqual(before);
    expect(await snapshotFilesystem(globalBinDir)).toEqual(beforeGlobalBin);
  });

  it("repairs launcher and alias drift without rewriting a converged selector", async () => {
    const dataRoot = await temporaryRoot("activation-read-only-drift");
    const globalBinDir = await temporaryRoot("activation-read-only-drift-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "f".repeat(40) });
    await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: cleanStartProbeRunner([]),
    });
    await writeFile(controllerLauncherPath(dataRoot), "drifted launcher\n");
    await rm(join(globalBinDir, "rawr"));
    await symlink("/wrong/controller/launcher", join(globalBinDir, "rawr"));
    const beforeData = await snapshotFilesystem(dataRoot);
    const beforeGlobalBin = await snapshotFilesystem(globalBinDir);
    const selectorBytes = await readFile(controllerSelectorPath(dataRoot));
    const selectorStatus = await lstat(controllerSelectorPath(dataRoot));

    const result = await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: async () => {
        throw new Error("read-only convergence must not probe");
      },
    });

    expect(result).toMatchObject({
      launcher: { kind: "installed", durability: "confirmed" },
      activation: { kind: "converged", selectorDurability: "unchanged" },
      globalAlias: { kind: "installed", durability: "confirmed" },
    });
    expect(isProductionControllerResultHealthy(result)).toBe(true);
    expect(await snapshotFilesystem(dataRoot)).not.toEqual(beforeData);
    expect(await snapshotFilesystem(globalBinDir)).not.toEqual(beforeGlobalBin);
    expect(await readFile(controllerSelectorPath(dataRoot))).toEqual(selectorBytes);
    const repairedSelectorStatus = await lstat(controllerSelectorPath(dataRoot));
    expect({ inode: repairedSelectorStatus.ino, mtime: repairedSelectorStatus.mtimeNs }).toEqual({
      inode: selectorStatus.ino,
      mtime: selectorStatus.mtimeNs,
    });

    const beforeThirdData = await snapshotFilesystem(dataRoot);
    const beforeThirdGlobalBin = await snapshotFilesystem(globalBinDir);
    const third = await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: async () => {
        throw new Error("full convergence must not probe");
      },
    });
    expect(third).toMatchObject({
      launcher: { kind: "converged" },
      activation: { kind: "converged" },
      globalAlias: { kind: "converged" },
    });
    expect(await snapshotFilesystem(dataRoot)).toEqual(beforeThirdData);
    expect(await snapshotFilesystem(globalBinDir)).toEqual(beforeThirdGlobalBin);
  });

  it("rejects a selected foreign-host release without mutating controller state", async () => {
    const dataRoot = await temporaryRoot("activation-foreign-host");
    const foreignPlatform = process.platform === "darwin" ? "linux" : "darwin";
    const release = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "0".repeat(40),
      platform: foreignPlatform,
      architecture: process.arch === "arm64" ? "arm64" : "x64",
    });
    await mkdir(dirname(controllerSelectorPath(dataRoot)), { recursive: true });
    await writeFile(controllerSelectorPath(dataRoot), `${release.controllerDigest}\n`);
    const before = await snapshotFilesystem(dataRoot);

    await expect(activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      commandRunner: async () => {
        throw new Error("foreign-host release must not probe");
      },
    })).rejects.toThrow("CONTROLLER_RUNTIME_HOST_MISMATCH");

    expect(await snapshotFilesystem(dataRoot)).toEqual(before);
  });

  it("retains the exact prior selector when global alias replacement fails before commit", async () => {
    const dataRoot = await temporaryRoot("activation-alias-failure");
    const globalBinDir = await temporaryRoot("activation-alias-failure-bin");
    const releaseA = await buildSemanticFixture({ dataRoot, sourceRevision: "1".repeat(40) });
    const releaseB = await buildSemanticFixture({ dataRoot, sourceRevision: "2".repeat(40) });
    await activateProductionController({
      dataRoot,
      controllerDigest: releaseA.controllerDigest,
      commandRunner: cleanStartProbeRunner([]),
    });
    const selectorPath = controllerSelectorPath(dataRoot);
    const beforeBytes = await readFile(selectorPath);
    const beforeStatus = await lstat(selectorPath);

    await expect(activateProductionController({
      dataRoot,
      controllerDigest: releaseB.controllerDigest,
      globalBinDir,
      commandRunner: cleanStartProbeRunner([]),
      globalAliasWriteObserver: (phase) => {
        if (phase === "before-replace") throw new Error("fixture alias precommit failure");
      },
    })).rejects.toThrow("fixture alias precommit failure");

    expect(await readFile(selectorPath)).toEqual(beforeBytes);
    const afterStatus = await lstat(selectorPath);
    expect({ inode: afterStatus.ino, mtime: afterStatus.mtimeNs }).toEqual({
      inode: beforeStatus.ino,
      mtime: beforeStatus.mtimeNs,
    });
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
  });

  it("publishes no global alias when a fresh selector replacement fails before commit", async () => {
    const dataRoot = await temporaryRoot("activation-fresh-selector-failure");
    const globalBinDir = await temporaryRoot("activation-fresh-selector-failure-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "3".repeat(40) });

    await expect(activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: cleanStartProbeRunner([]),
      selectorStore: createNodeControllerSelectorStore((phase) => {
        if (phase === "before-replace") throw new Error("fixture selector precommit failure");
      }),
    })).rejects.toThrow("fixture selector precommit failure");

    await expect(lstat(controllerSelectorPath(dataRoot))).rejects.toThrow();
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
    expect(await readdir(globalBinDir)).toEqual([]);
  });

  it("settles a post-selector alias failure on retry and then converges read-only", async () => {
    const dataRoot = await temporaryRoot("activation-alias-settlement-retry");
    const globalBinDir = await temporaryRoot("activation-alias-settlement-retry-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "4".repeat(40) });

    const first = await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: cleanStartProbeRunner([]),
      globalAliasWriteObserver: (phase) => {
        if (phase === "before-commit") throw new Error("fixture alias commit failure");
      },
    });
    expect(first).toMatchObject({
      activation: { kind: "activated", selectorDurability: "confirmed" },
      globalAlias: { kind: "failed", error: "fixture alias commit failure" },
    });
    expect(isProductionControllerResultHealthy(first)).toBe(false);
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
    const selectorBytes = await readFile(controllerSelectorPath(dataRoot));
    const selectorStatus = await lstat(controllerSelectorPath(dataRoot));

    const retry = await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: async () => {
        throw new Error("auxiliary settlement retry must not probe");
      },
    });
    expect(retry).toMatchObject({
      launcher: { kind: "converged" },
      activation: { kind: "converged", selectorDurability: "unchanged" },
      globalAlias: { kind: "installed", durability: "confirmed" },
    });
    expect(await readFile(controllerSelectorPath(dataRoot))).toEqual(selectorBytes);
    const retrySelectorStatus = await lstat(controllerSelectorPath(dataRoot));
    expect({ inode: retrySelectorStatus.ino, mtime: retrySelectorStatus.mtimeNs }).toEqual({
      inode: selectorStatus.ino,
      mtime: selectorStatus.mtimeNs,
    });

    const beforeThirdData = await snapshotFilesystem(dataRoot);
    const beforeThirdGlobalBin = await snapshotFilesystem(globalBinDir);
    const third = await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      commandRunner: async () => {
        throw new Error("settled activation must not probe");
      },
    });
    expect(third).toMatchObject({
      launcher: { kind: "converged" },
      activation: { kind: "converged" },
      globalAlias: { kind: "converged" },
    });
    expect(await snapshotFilesystem(dataRoot)).toEqual(beforeThirdData);
    expect(await snapshotFilesystem(globalBinDir)).toEqual(beforeThirdGlobalBin);
  });

  it("aborts a prepared alias when the selector changes before auxiliary commit", async () => {
    const dataRoot = await temporaryRoot("activation-auxiliary-selector-race");
    const globalBinDir = await temporaryRoot("activation-auxiliary-selector-race-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "5".repeat(40) });
    await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      commandRunner: cleanStartProbeRunner([]),
    });
    const delegate = createNodeControllerSelectorStore();
    let reads = 0;
    const selectorStore: ControllerSelectorStore = {
      async read(path) {
        reads += 1;
        return reads === 2 ? { kind: "missing" } : await delegate.read(path);
      },
      replace: delegate.replace,
    };

    await expect(activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      globalBinDir,
      selectorStore,
      commandRunner: async () => {
        throw new Error("auxiliary selector race must not probe");
      },
    })).rejects.toThrow("CONTROLLER_SELECTION_CHANGED_DURING_AUXILIARY_REPAIR");

    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
    expect(await readdir(globalBinDir)).toEqual([]);
  });

  it("preserves selector-race and prepared-alias cleanup failures", async () => {
    const dataRoot = await temporaryRoot("activation-auxiliary-cleanup-failure");
    const globalBinDir = await temporaryRoot("activation-auxiliary-cleanup-failure-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "7".repeat(40) });
    await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      commandRunner: cleanStartProbeRunner([]),
    });
    const delegate = createNodeControllerSelectorStore();
    let reads = 0;
    const selectorStore: ControllerSelectorStore = {
      async read(path) {
        reads += 1;
        return reads === 2 ? { kind: "missing" } : await delegate.read(path);
      },
      replace: delegate.replace,
    };
    let observed: unknown;

    try {
      await activateProductionController({
        dataRoot,
        controllerDigest: release.controllerDigest,
        globalBinDir,
        selectorStore,
        commandRunner: async () => {
          throw new Error("auxiliary cleanup race must not probe");
        },
        globalAliasWriteObserver: async (phase) => {
          if (phase !== "before-replace") return;
          const temporaryName = (await readdir(globalBinDir)).find((name) =>
            name.startsWith("rawr.tmp-"),
          );
          if (temporaryName === undefined) {
            throw new Error("fixture expected a prepared global alias");
          }
          const temporaryPath = join(globalBinDir, temporaryName);
          await rm(temporaryPath);
          await mkdir(temporaryPath);
        },
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(AggregateError);
    const aggregateErrors = (observed as AggregateError).errors;
    expect(aggregateErrors).toHaveLength(2);
    const errors = aggregateErrors.map(String).join("\n");
    expect(errors).toContain("CONTROLLER_SELECTION_CHANGED_DURING_AUXILIARY_REPAIR");
    expect(String(aggregateErrors[1])).toContain("rm");
    expect(String(aggregateErrors[1])).toContain("rawr.tmp-");
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
  });

  it("preserves failed alias settlement when the final selector inspection also changes", async () => {
    const dataRoot = await temporaryRoot("activation-alias-and-final-selector-failure");
    const globalBinDir = await temporaryRoot("activation-alias-and-final-selector-failure-bin");
    const release = await buildSemanticFixture({ dataRoot, sourceRevision: "6".repeat(40) });
    await activateProductionController({
      dataRoot,
      controllerDigest: release.controllerDigest,
      commandRunner: cleanStartProbeRunner([]),
    });
    const delegate = createNodeControllerSelectorStore();
    let reads = 0;
    const selectorStore: ControllerSelectorStore = {
      async read(path) {
        reads += 1;
        return reads === 3 ? { kind: "missing" } : await delegate.read(path);
      },
      replace: delegate.replace,
    };
    let observed: unknown;

    try {
      await activateProductionController({
        dataRoot,
        controllerDigest: release.controllerDigest,
        globalBinDir,
        selectorStore,
        commandRunner: async () => {
          throw new Error("combined settlement failure must not probe");
        },
        globalAliasWriteObserver: (phase) => {
          if (phase === "before-commit") throw new Error("fixture combined alias failure");
        },
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(AggregateError);
    const errors = (observed as AggregateError).errors.map(String).join("\n");
    expect(errors).toContain("GLOBAL_ALIAS_SETTLEMENT_FAILED:fixture combined alias failure");
    expect(errors).toContain("CONTROLLER_SELECTION_CHANGED_DURING_AUXILIARY_REPAIR");
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
    expect(await readdir(globalBinDir)).toEqual([]);
  });

  it("retains the exact prior selector when the candidate clean-start probe fails", async () => {
    const dataRoot = await temporaryRoot("activation-probe-failure");
    const releaseA = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "c".repeat(40),
    });
    const releaseB = await buildSemanticFixture({
      dataRoot,
      sourceRevision: "d".repeat(40),
    });
    await activateProductionController({
      dataRoot,
      controllerDigest: releaseA.controllerDigest,
      commandRunner: cleanStartProbeRunner([]),
    });
    const selectorPath = controllerSelectorPath(dataRoot);
    const beforeBytes = await readFile(selectorPath);
    const beforeStatus = await lstat(selectorPath);
    const globalBinDir = await temporaryRoot("activation-probe-failure-bin");

    await expect(
      activateProductionController({
        dataRoot,
        controllerDigest: releaseB.controllerDigest,
        globalBinDir,
        commandRunner: cleanStartProbeRunner([], {
          digest: releaseB.controllerDigest,
          argv: ["--help"],
        }),
      }),
    ).rejects.toThrow("CONTROLLER_CLEAN_START_FAILED:help");

    expect(await readFile(selectorPath)).toEqual(beforeBytes);
    const afterStatus = await lstat(selectorPath);
    expect({ inode: afterStatus.ino, mtime: afterStatus.mtimeNs }).toEqual({
      inode: beforeStatus.ino,
      mtime: beforeStatus.mtimeNs,
    });
    await expect(lstat(join(globalBinDir, "rawr"))).rejects.toThrow();
  });
});

describe("global installer scripts", () => {
  it("classifies failed production cleanup as an unhealthy command result", () => {
    expect(isProductionControllerResultHealthy({
      sourceRevision: "a".repeat(40),
      release: {
        kind: "reused",
        controllerDigest: "b".repeat(64),
        releaseRoot: "/data/controllers/b",
        durability: "unchanged",
        cleanup: "not-required",
      },
      operationCleanup: { status: "failed", error: "fixture cleanup failure" },
      launcher: { kind: "converged", path: "/data/bin/rawr", durability: "unchanged" },
      activation: {
        kind: "converged",
        controllerDigest: "b".repeat(64),
        releaseRoot: "/data/controllers/b",
        selectorPath: "/data/controller/active",
        replaced: null,
        selectorDurability: "unchanged",
      },
      globalAlias: null,
    })).toBe(false);
  });

  it("delegate only to the production controller builder without checkout ownership", async () => {
    const workspaceRoot = resolve(import.meta.dir, "../../..");
    for (const name of ["install-global-rawr.sh", "activate-global-rawr.sh"]) {
      const source = await readFile(join(workspaceRoot, "scripts", "dev", name), "utf8");
      expect(source).toContain("scripts/controller/cli-build-production.ts");
      expect(source).not.toContain("global-rawr-owner-path");
      expect(source).not.toContain("apps/cli/bin/run.js");
      expect(source).not.toContain("ln -s");
      expect(source).toContain("-u BUN_INSTALL");
      expect(source).toContain("-u BUN_INSTALL_CACHE_DIR");
      expect(source).toContain("--no-env-file");
      expect(source).toContain("--no-install");
    }
  });
});
