import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const topicRoot = "plugins/cli/topics/foundation";
const commandRunner = new URL("../../src/generators/run-cli-command.ts", import.meta.url).href;
const extensionRunner = new URL("../../src/generators/run-cli-extension.ts", import.meta.url).href;

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "habitat-native-generator-"));
  roots.push(root);
  return root;
}

function write(root: string, path: string, contents: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), contents);
}

function files(root: string, directory = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, files(root, path));
    else result[path] = readFileSync(join(root, path), "utf8");
  }
  return result;
}

function invoke(
  cwd: string,
  module: string,
  name: string,
  options: object,
  publication: { readonly dryRun?: boolean } = {},
  afterStartCwd?: string
) {
  const program = `
    import { ${name} } from ${JSON.stringify(module)};
    try {
      const pending = ${name}(${JSON.stringify(options)}, ${JSON.stringify(publication)});
      ${afterStartCwd === undefined ? "" : `process.chdir(${JSON.stringify(afterStartCwd)});`}
      const result = await pending;
      process.stdout.write(JSON.stringify({
        result,
        frozen: Object.isFrozen(result) && Object.isFrozen(result.paths),
      }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: error.message }));
      process.exitCode = 1;
    }
  `;
  const env: NodeJS.ProcessEnv = { ...process.env, NX_DAEMON: "false" };
  delete env.NX_WORKSPACE_ROOT_PATH;
  const child = spawnSync("bun", ["--eval", program], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(child.error, child.stderr).toBeUndefined();
  expect(child.signal, child.stderr).toBeNull();
  expect(child.stdout, child.stderr).not.toBe("");
  return { status: child.status, ...JSON.parse(child.stdout) };
}

function habitatFixture(): string {
  const root = temporaryRoot();
  write(root, "package.json", JSON.stringify({ name: "habitat-workspace", private: true }));
  write(root, "nx.json", "{}\n");
  write(root, "apps/habitat/project.json", JSON.stringify({ name: "@habitat-ai/cli" }));
  write(
    root,
    "apps/habitat/habitat.toml",
    'ownerProject = "@habitat-ai/cli"\nblueprint = "app"\nblueprintVersion = 2\n[roots]\nproject = "apps/habitat"\n'
  );
  for (const path of ["package.json", "project.json"]) {
    write(root, `${topicRoot}/${path}`, JSON.stringify({ name: "@habitat-ai/plugin-foundation" }));
  }
  write(
    root,
    `${topicRoot}/habitat.toml`,
    `ownerProject = "@habitat-ai/plugin-foundation"\nblueprint = "plugin-cli-topic"\nblueprintVersion = 1\n[roots]\nproject = "${topicRoot}"\n`
  );
  write(
    root,
    `${topicRoot}/src/index.ts`,
    'import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";\n' +
      'export const createPlugin = defineCliTopicPlugin.factory()({ capability: "foundation", services: {}, commands: [] });\n'
  );
  write(root, "unrelated.txt", "preserved");
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("native source generator runners", () => {
  it("imports stateless runners without reading a deployment directory", () => {
    const root = temporaryRoot();
    const program = `
      process.cwd = () => { throw new Error("Cold import read deployment cwd"); };
      await import(${JSON.stringify(commandRunner)});
      await import(${JSON.stringify(extensionRunner)});
    `;
    const child = spawnSync("bun", ["--eval", program], { cwd: root, encoding: "utf8" });
    expect(child.status, child.stdout + child.stderr).toBe(0);
    expect(files(root)).toEqual({});
  });

  it("publishes a portable extension in a foreign cwd and converges without writes", () => {
    const root = temporaryRoot();
    write(root, "unrelated.txt", "preserved");
    const options = { id: "portable", destination: "extension" };
    const before = files(root);
    const dryRun = invoke(root, extensionRunner, "runCliExtensionGenerator", options, {
      dryRun: true,
    });
    expect(dryRun.status).toBe(0);
    expect(dryRun.result.status).toBe("dry-run");
    expect(dryRun.result.paths).toHaveLength(6);
    expect(files(root)).toEqual(before);
    const created = invoke(root, extensionRunner, "runCliExtensionGenerator", options);
    expect(created).toEqual({
      status: 0,
      frozen: true,
      result: { status: "created", paths: dryRun.result.paths },
    });
    expect(JSON.parse(readFileSync(join(root, "extension/package.json"), "utf8")).name).toBe(
      "habitat-extension-portable"
    );
    expect(existsSync(join(root, ".nx"))).toBe(false);
    expect(existsSync(join(root, "extension/project.json"))).toBe(false);
    const createdFiles = files(root);
    const modified = statSync(join(root, "extension/package.json"), { bigint: true }).mtimeNs;
    expect(invoke(root, extensionRunner, "runCliExtensionGenerator", options)).toEqual({
      status: 0,
      frozen: true,
      result: { status: "converged", paths: [] },
    });
    expect(files(root)).toEqual(createdFiles);
    expect(statSync(join(root, "extension/package.json"), { bigint: true }).mtimeNs).toBe(modified);
  }, 120_000);

  it("captures cwd before asynchronous loading rather than rereading mutable process state", () => {
    const root = temporaryRoot();
    const other = temporaryRoot();
    const result = invoke(
      root,
      extensionRunner,
      "runCliExtensionGenerator",
      { id: "original", destination: "extension" },
      {},
      other
    );
    expect(result.status).toBe(0);
    expect(existsSync(join(root, "extension/package.json"))).toBe(true);
    expect(files(other)).toEqual({});
  });

  it("keeps an extension's complete preflight refusal ahead of every disk write", () => {
    const root = temporaryRoot();
    write(root, "extension/tsconfig.json", "divergent");
    const before = files(root);
    const result = invoke(root, extensionRunner, "runCliExtensionGenerator", {
      id: "portable",
      destination: "extension",
    });
    expect(result.status).toBe(1);
    expect(result.error).toContain("divergent");
    expect(files(root)).toEqual(before);
  });

  it("runs the official generator against its exact qualified cwd, then converges", () => {
    const root = habitatFixture();
    const before = files(root);
    const options = { topic: "foundation", name: "echo" };
    const dryRun = invoke(root, commandRunner, "runCliCommandGenerator", options, {
      dryRun: true,
    });
    expect(dryRun.status, dryRun.error).toBe(0);
    expect(dryRun.result.status).toBe("dry-run");
    expect(dryRun.result.paths).toHaveLength(4);
    for (const [path, contents] of Object.entries(before)) {
      expect(readFileSync(join(root, path), "utf8")).toBe(contents);
    }
    expect(existsSync(join(root, `${topicRoot}/src/commands/echo.ts`))).toBe(false);
    const created = invoke(root, commandRunner, "runCliCommandGenerator", options);
    expect(created).toEqual({
      status: 0,
      frozen: true,
      result: { status: "created", paths: dryRun.result.paths },
    });
    expect(readFileSync(join(root, `${topicRoot}/src/index.ts`), "utf8")).toContain(
      "commands: [echoCommand]"
    );
    expect(readFileSync(join(root, `${topicRoot}/project.json`), "utf8")).toBe(
      before[`${topicRoot}/project.json`]
    );
    expect(readFileSync(join(root, "unrelated.txt"), "utf8")).toBe("preserved");
    expect(invoke(root, commandRunner, "runCliCommandGenerator", options)).toEqual({
      status: 0,
      frozen: true,
      result: { status: "converged", paths: [] },
    });
    expect(existsSync(join(root, "apps/habitat/oclif.manifest.json"))).toBe(false);
  }, 120_000);

  it("does not search parents or redirect a foreign cwd to an installed app root", () => {
    const root = habitatFixture();
    const nested = join(root, "foreign");
    mkdirSync(nested);
    write(nested, "package.json", '{"name":"foreign","private":true}\n');
    const before = files(root);
    const result = invoke(nested, commandRunner, "runCliCommandGenerator", {
      topic: "foundation",
      name: "echo",
    });
    expect(result.status).toBe(1);
    expect(result.error).toContain("require the Habitat repository");
    expect(files(root)).toEqual(before);
  });
});
