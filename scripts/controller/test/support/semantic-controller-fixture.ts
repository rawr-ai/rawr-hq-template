import { chmod, mkdir, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  controllerCommandPackages,
} from "../../../../apps/cli/src/lib/controller/classification.ts";
import type {
  ControllerArchitecture,
  ControllerDigest,
  ControllerPlatform,
} from "@rawr/controller-release";
import { buildControllerRelease } from "../../build-release.ts";
import { createExactPayloadSourcePlan } from "../../production/payload.ts";

type SemanticPackageOptions = Readonly<{
  appRoot: string;
  packageId: string;
}> & (
  | Readonly<{ kind: "manager" }>
  | Readonly<{
      kind: "command";
      commandId: string;
      cliPlugins?: readonly string[];
    }>
);

async function writeSemanticPackage(options: SemanticPackageOptions): Promise<{
  version: string;
}> {
  const version = "1.0.0";
  const root = join(options.appRoot, "node_modules", options.packageId);
  await mkdir(root, { recursive: true });
  if (options.kind === "manager") {
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
    return { version };
  }

  const commandId = options.commandId;
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
  return { version };
}

export async function buildSemanticFixture(options: {
  workspaceRoot: string;
  mismatch?: boolean;
  compositionPlugins?: readonly string[];
  dataRoot?: string;
  sourceRevision?: string;
  platform?: ControllerPlatform;
  architecture?: ControllerArchitecture;
  excludedPackageId?: string;
}): Promise<{
  releaseRoot: string;
  controllerDigest: ControllerDigest;
  workspaceRoot: string;
  dataRoot: string;
}> {
  const workspaceRoot = options.workspaceRoot;
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
      const staged = await writeSemanticPackage({
        kind: "manager",
        appRoot,
        packageId: row.packageId,
      });
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
      kind: "command",
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
      topics: [declaredCommandId.split(":")[0] ?? declaredCommandId],
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
    dataRoot: await realpath(dataRoot),
  };
}
