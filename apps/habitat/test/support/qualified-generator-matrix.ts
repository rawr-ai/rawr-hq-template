import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "vitest";

interface RunOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly timeoutMs?: number;
}

interface MatrixInput {
  readonly acceptanceRoot: string;
  readonly consumerRoot: string;
  readonly version: string;
  readonly run: (
    executable: string,
    args: readonly string[],
    options?: RunOptions
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

/** Exercises only installed generator and public host contracts in an isolated consumer. */
export async function assertInstalledQualifiedGenerators(input: MatrixInput): Promise<void> {
  const root = path.join(input.acceptanceRoot, "generator-habitat");
  const topic = "plugins/cli/topics/foundation";
  async function files(values: Readonly<Record<string, string>>) {
    for (const [relative, contents] of Object.entries(values)) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), contents);
    }
  }
  async function command(executable: string, args: readonly string[], cwd = root) {
    return input.run(executable, args, { cwd, timeoutMs: 120_000 });
  }
  async function succeeds(executable: string, args: readonly string[], cwd = root) {
    const result = await command(executable, args, cwd);
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
    return result;
  }
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await files({
    "package.json": json({
      name: "habitat-workspace",
      private: true,
      type: "module",
      workspaces: ["plugins/cli/topics/*"],
      nx: {},
      dependencies: {
        "@habitat-ai/cli": input.version,
        "@habitat-ai/sdk": input.version,
        "@oclif/core": "4.13.3",
        effect: "4.0.0-beta.101",
      },
      devDependencies: {
        nx: "23.1.1",
        typescript: "5.9.3",
        "@types/node": "24.13.3",
        "bun-types": "1.3.14",
      },
      oclif: {
        bin: "generator-fixture",
        commands: { strategy: "explicit", target: "./discovery.mjs", identifier: "COMMANDS" },
        hooks: { finally: { target: "./discovery.mjs", identifier: "FINALLY_HOOK" } },
      },
    }),
    "nx.json": "{}\n",
    "tsconfig.base.json": json({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
      },
    }),
    "apps/habitat/project.json": json({ name: "@habitat-ai/cli" }),
    "apps/habitat/habitat.toml":
      'schemaVersion = 1\nid = "habitat-cli"\nownerProject = "@habitat-ai/cli"\nblueprint = "app"\nblueprintVersion = 2\n[roots]\nproject = "apps/habitat"\n[selections]\n',
    "apps/habitat/habitat.app.ts": "export const selectedApp = 'unchanged';\n",
    "apps/habitat/runtime/processes.ts": "export const processes = 'unchanged';\n",
    "apps/habitat/runtime/profiles/local.ts": "export const profile = 'unchanged';\n",
    [`${topic}/package.json`]: json({
      name: "@habitat-ai/plugin-foundation",
      private: true,
      type: "module",
      dependencies: { "@habitat-ai/sdk": input.version, "@oclif/core": "4.13.3" },
      scripts: { build: "tsc -p tsconfig.build.json" },
    }),
    [`${topic}/project.json`]: json({
      name: "@habitat-ai/plugin-foundation",
      tags: ["type:plugin", "role:cli"],
    }),
    [`${topic}/habitat.toml`]: `schemaVersion = 1\nid = "plugin-foundation"\nownerProject = "@habitat-ai/plugin-foundation"\nblueprint = "plugin-cli-topic"\nblueprintVersion = 1\n[roots]\nproject = "${topic}"\n[selections]\n`,
    [`${topic}/src/index.ts`]:
      'import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";\nimport { services } from "./services.js";\nexport const createPlugin = defineCliTopicPlugin.factory()({capability: "foundation", services, commands: []});\n',
    [`${topic}/src/services.ts`]: "export const services = {};\n",
    [`${topic}/tsconfig.json`]: json({
      extends: "../../../../tsconfig.base.json",
      include: ["src", "test"],
    }),
    [`${topic}/tsconfig.build.json`]: json({
      extends: "./tsconfig.json",
      compilerOptions: { rootDir: "src", outDir: "dist" },
      include: ["src"],
    }),
  });
  // Carry only the acceptance registry configuration, never repository modules.
  try {
    await copyFile(path.join(input.consumerRoot, ".npmrc"), path.join(root, ".npmrc"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await succeeds("bun", ["install", "--ignore-scripts"]);
  const nx = path.join(root, "node_modules/.bin/nx");
  const generate = (kind: string, args: readonly string[]) => [
    "generate",
    `@habitat-ai/cli:${kind}`,
    ...args,
    "--no-interactive",
  ];
  const echo = generate("cli-command", ["--topic=foundation", "--name=echo"]);
  const extension = generate("cli-extension", ["--id=sample", "--destination=extensions/sample"]);
  const fixedPaths = [
    "package.json",
    "nx.json",
    "apps/habitat/project.json",
    "apps/habitat/habitat.toml",
    "apps/habitat/habitat.app.ts",
    "apps/habitat/runtime/processes.ts",
    "apps/habitat/runtime/profiles/local.ts",
  ];
  const fixed = await Promise.all(
    fixedPaths.map((file) => readFile(path.join(root, file), "utf8"))
  );
  const dryBefore = await snapshot(root);
  await succeeds(nx, [...echo, "--dry-run"]);
  await succeeds(nx, [...extension, "--dry-run"]);
  expect(await snapshot(root)).toEqual(dryBefore);
  await succeeds(nx, echo);
  await succeeds(nx, extension);
  const commandSource = await readFile(path.join(root, topic, "src/commands/echo.ts"), "utf8");
  expect(commandSource).toContain('id: "foundation:echo"');
  expect(commandSource).toContain("@habitat-ai/sdk/plugins/cli/oclif");
  expect(await readFile(path.join(root, topic, "src/index.ts"), "utf8")).toContain(
    "commands: [echoCommand]"
  );
  expect(await listFiles(path.join(root, topic))).toEqual([
    "habitat.toml",
    "package.json",
    "project.json",
    "src/commands/echo.ts",
    "src/index.ts",
    "src/services.ts",
    "test/commands/echo.test.ts",
    "tsconfig.build.json",
    "tsconfig.json",
  ]);
  expect(await listFiles(path.join(root, "extensions/sample"))).toEqual([
    ".gitignore",
    "README.md",
    "package.json",
    "src/commands.ts",
    "test/commands.test.mjs",
    "tsconfig.json",
  ]);
  const complete = await snapshot(root);
  await succeeds(nx, echo);
  await succeeds(nx, extension);
  expect(await snapshot(root)).toEqual(complete);
  await files({
    [`${topic}/test/commands/refused.test.ts`]: "// divergent late path\n",
    "extensions/refused/tsconfig.json": '{"divergent":true}\n',
  });
  const refusedBefore = await snapshot(root);
  for (const args of [
    generate("cli-command", ["--topic=foundation", "--name=refused"]),
    generate("cli-extension", ["--id=refused", "--destination=extensions/refused"]),
  ]) {
    const result = await command(nx, args);
    expect(result.exitCode, result.stdout + result.stderr).not.toBe(0);
    expect(await snapshot(root)).toEqual(refusedBefore);
  }
  const originalPackage = await readFile(path.join(root, "package.json"), "utf8");
  const foreignPackage = JSON.parse(originalPackage);
  foreignPackage.name = "foreign-product";
  await files({ "package.json": json(foreignPackage) });
  const foreignBefore = await snapshot(root);
  expect(
    (await command(nx, generate("cli-command", ["--topic=foundation", "--name=foreign"]))).exitCode
  ).not.toBe(0);
  expect(await snapshot(root)).toEqual(foreignBefore);
  await files({ "package.json": originalPackage });
  expect(
    await Promise.all(fixedPaths.map((file) => readFile(path.join(root, file), "utf8")))
  ).toEqual(fixed);
  const projects = await succeeds(nx, ["show", "projects", "--json"]);
  expect(JSON.parse(projects.stdout).sort()).toEqual([
    "@habitat-ai/cli",
    "@habitat-ai/plugin-foundation",
    "habitat-workspace",
  ]);
  // Installation/build/testing here belongs to the proof, never either generator.
  await succeeds("bun", ["install", "--ignore-scripts"]);
  await succeeds("bun", ["run", "build"], path.join(root, topic));
  await succeeds("bun", ["run", "test:cli-commands"], path.join(root, topic));
  const extensionRoot = path.join(input.acceptanceRoot, "generator-extension-portable");
  await cp(path.join(root, "extensions/sample"), extensionRoot, { recursive: true });
  await succeeds("bun", ["install", "--ignore-scripts"], extensionRoot);
  await succeeds("bun", ["run", "build"], extensionRoot);
  await succeeds("bun", ["run", "test"], extensionRoot);
  await files({ "discovery.mjs": discoverySource, "invoke.mjs": invocationSource });
  for (const [args, expected] of [
    [["foundation:echo", "Hello"], "Hello\n"],
    [["foundation:echo", "Hello", "--uppercase"], "HELLO\n"],
  ] as const) {
    const result = await succeeds("node", ["invoke.mjs", ...args]);
    expect(result.stdout).toBe(expected);
    expect(result.stderr).toBe("");
  }
}

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (["node_modules", ".nx", ".git", "dist"].includes(entry.name)) continue;
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...(await listFiles(root, name)));
    else result.push(name);
  }
  return result.sort();
}

async function snapshot(root: string) {
  return Promise.all(
    (await listFiles(root)).map(async (file) => {
      const absolute = path.join(root, file);
      return {
        file,
        hash: createHash("sha256")
          .update(await readFile(absolute))
          .digest("hex"),
        mtime: (await stat(absolute)).mtimeMs,
      };
    })
  );
}

const discoverySource = `import { defineApp, defineEntrypoint, defineProcessCatalog } from "@habitat-ai/sdk/app";
import { defineRuntimeProfile } from "@habitat-ai/sdk/runtime/profiles";
import { deriveRuntimeArtifacts } from "@habitat-ai/sdk/runtime/derivation";
import { createOclifSourceBundle } from "@habitat-ai/cli/host";
import { createPlugin } from "./plugins/cli/topics/foundation/dist/index.js";
const app = defineApp({id:"fixture", plugins:[createPlugin()]});
const processes = defineProcessCatalog({cli:{id:"cli",roles:["cli"],harness:"fixture.oclif"}});
const profile = defineRuntimeProfile({id:"local",providers:[],configSources:[],harnesses:["fixture.oclif"]});
export const entrypoint = defineEntrypoint({id:"fixture.cli",app,profile,process:processes.cli,identity:{app:"fixture",process:"cli",entrypoint:"fixture.cli",deployment:"test",source:"generator"}});
export const sourceBundle = createOclifSourceBundle(deriveRuntimeArtifacts({entrypoint,profileId:profile.id}));
export const COMMANDS = sourceBundle.COMMANDS;
export { FINALLY_HOOK } from "@habitat-ai/cli/host";
`;

const invocationSource = `import { startApp } from "@habitat-ai/sdk/app";
import { createOclifHost } from "@habitat-ai/cli/host";
import { entrypoint, sourceBundle } from "./discovery.mjs";
const host = createOclifHost({harnessId:"fixture.oclif",root:process.cwd(),sourceBundle,args:process.argv.slice(2)});
await host.execute(startApp(entrypoint,{sources:{appRoot:process.cwd()},integrations:[host.integration],finalization:{policy:"waitForNativeStop",deadlineMs:1000}}));
`;
