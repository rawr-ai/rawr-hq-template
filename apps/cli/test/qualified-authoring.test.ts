import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CONTENT_WORKSPACE_PROTOCOL,
  authorCuratedAgentPlugin,
  parseCuratedAgentPluginAuthoringRequest,
  verifyContentWorkspaceV1,
} from "../src/lib/authoring/agent-plugin";
import {
  authorOfficialCommand,
  parseOfficialCommandAuthoringRequest,
  verifyOfficialCommandTemplateWorkspace,
} from "../src/lib/authoring/cli-command";
import {
  authorExternalExtension,
  parseExternalExtensionAuthoringRequest,
} from "../src/lib/authoring/cli-extension";
import {
  NodeQualifiedWritePort,
  completeOrderedWritePlan,
  executeAuthoringPlan,
  qualifiedTextWrite,
  verifiedDestinationRoot,
  type QualifiedWritePort,
} from "../src/lib/authoring/shared";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(removeTempRoot));
});

describe("qualified authoring write plans", () => {
  it("dry-runs, authors, converges, and rejects divergent collisions without overwrite", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const plan = completeOrderedWritePlan(root, [
      qualifiedTextWrite("b.txt", "b\n"),
      qualifiedTextWrite("a.txt", "a\n"),
    ]);
    const port = new NodeQualifiedWritePort();

    expect((await executeAuthoringPlan({ plan, dryRun: true, port })).kind).toBe("AuthoringDryRun");
    await expect(fs.access(path.join(root, "a.txt"))).rejects.toThrow();
    expect((await executeAuthoringPlan({ plan, dryRun: false, port })).kind).toBe("AuthoringAuthored");
    expect((await executeAuthoringPlan({ plan, dryRun: false, port })).kind).toBe("AuthoringConverged");

    await fs.writeFile(path.join(root, "b.txt"), "foreign\n");
    const rejected = await executeAuthoringPlan({ plan, dryRun: false, port });
    expect(rejected.kind).toBe("AuthoringRejected");
    expect(await fs.readFile(path.join(root, "b.txt"), "utf8")).toBe("foreign\n");
  });

  it("preflights every path before publishing when a later path conflicts", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const plan = completeOrderedWritePlan(root, [
      qualifiedTextWrite("a-missing.txt", "a\n"),
      qualifiedTextWrite("z-conflict.txt", "z\n"),
    ]);
    const published: string[] = [];
    const port: QualifiedWritePort = {
      async inspect(_root, write) {
        return write.relativePath === "z-conflict.txt"
          ? { kind: "Conflict", message: "injected collision" }
          : { kind: "Missing" };
      },
      async publish(_root, write) {
        published.push(write.relativePath);
        return { kind: "Published" };
      },
    };

    expect(await executeAuthoringPlan({ plan, dryRun: false, port })).toMatchObject({
      kind: "AuthoringRejected",
      issues: [{ code: "PATH_COLLISION", path: "z-conflict.txt" }],
    });
    expect(published).toEqual([]);
  });

  it("reports an empty prefix when the first publication fails", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const plan = completeOrderedWritePlan(root, [qualifiedTextWrite("a.txt", "a")]);
    const port: QualifiedWritePort = {
      async inspect() {
        return { kind: "Missing" };
      },
      async publish() {
        return { kind: "Failed", message: "injected" };
      },
    };

    const result = await executeAuthoringPlan({ plan, dryRun: false, port });
    expect(result).toMatchObject({
      kind: "AuthoringFailed",
      applied: [],
      failure: { code: "PUBLICATION_FAILED", path: "a.txt" },
    });
  });

  it("reports only newly published paths after a failure and retries only remaining missing paths", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const plan = completeOrderedWritePlan(root, [
      qualifiedTextWrite("a.txt", "a"),
      qualifiedTextWrite("b.txt", "b"),
      qualifiedTextWrite("c.txt", "c"),
    ]);
    const present = new Set<string>(["a.txt"]);
    const publications: string[] = [];
    let failLast = true;
    const port: QualifiedWritePort = {
      async inspect(_root, write) {
        return present.has(write.relativePath) ? { kind: "Exact" } : { kind: "Missing" };
      },
      async publish(_root, write) {
        publications.push(write.relativePath);
        if (write.relativePath === "c.txt" && failLast) return { kind: "Failed", message: "injected" };
        present.add(write.relativePath);
        return { kind: "Published" };
      },
    };
    const result = await executeAuthoringPlan({ plan, dryRun: false, port });
    expect(result.kind).toBe("AuthoringPartial");
    if (result.kind !== "AuthoringPartial") return;
    expect(result.applied.map((write) => write.relativePath)).toEqual(["b.txt"]);
    expect(result.failure.path).toBe("c.txt");

    failLast = false;
    const retried = await executeAuthoringPlan({ plan, dryRun: false, port });
    expect(retried.kind).toBe("AuthoringAuthored");
    if (retried.kind === "AuthoringAuthored") {
      expect(retried.applied.map((write) => write.relativePath)).toEqual(["c.txt"]);
    }
    expect(publications).toEqual(["b.txt", "c.txt", "c.txt"]);
  });

  it("rejects a symbolic-link parent without writing outside the destination", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const outside = await tempRoot();
    await fs.symlink(outside, path.join(root, "linked"), "dir");
    const plan = completeOrderedWritePlan(root, [qualifiedTextWrite("linked/file.txt", "blocked\n")]);

    const result = await executeAuthoringPlan({ plan, dryRun: false, port: new NodeQualifiedWritePort() });

    expect(result).toMatchObject({
      kind: "AuthoringRejected",
      issues: [{ code: "PATH_COLLISION", path: "linked/file.txt" }],
    });
    await expect(fs.access(path.join(outside, "file.txt"))).rejects.toThrow();
  });

  it("returns a closed failure when completed publication cannot be verified", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const plan = completeOrderedWritePlan(root, [qualifiedTextWrite("a.txt", "a")]);
    let inspections = 0;
    const port: QualifiedWritePort = {
      async inspect() {
        inspections += 1;
        if (inspections === 3) throw new Error("verification unavailable");
        return { kind: "Missing" };
      },
      async publish() {
        return { kind: "Published" };
      },
    };

    const result = await executeAuthoringPlan({ plan, dryRun: false, port });
    expect(result).toMatchObject({
      kind: "AuthoringFailed",
      applied: [],
      failure: { code: "PUBLICATION_NOT_VERIFIED", path: "a.txt", message: "verification unavailable" },
    });
  });
});

describe("qualified authoring owners", () => {
  it("reports missing Template workspace inputs at their owning boundary", () => {
    expect(parseOfficialCommandAuthoringRequest({
      topic: "sample", name: "inspect", workspaceCwd: "", dryRun: false,
    })).toMatchObject({ ok: false, issues: [{ path: "workspaceCwd" }] });
  });

  it("creates official Template command source and behavior test under its exact owner", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    expect(parseOfficialCommandAuthoringRequest({
      topic: "plugins", name: "wrong-owner", workspaceCwd: root, dryRun: false,
    }).ok).toBe(false);
    const request = must(parseOfficialCommandAuthoringRequest({
      topic: "sample", name: "inspect", workspaceCwd: root, dryRun: false,
    }));
    const result = await authorOfficialCommand(request, { verifyWorkspace: async () => root });
    expect(result.kind).toBe("AuthoringAuthored");
    await fs.access(path.join(root, "apps", "cli", "src", "commands", "sample", "inspect.ts"));
    await fs.access(path.join(root, "apps", "cli", "test", "generated", "sample", "inspect.test.ts"));
    const firstSnapshot = await treeSnapshot(root);
    expect((await authorOfficialCommand(request, { verifyWorkspace: async () => root })).kind)
      .toBe("AuthoringConverged");
    expect(await treeSnapshot(root)).toEqual(firstSnapshot);
  });

  it("keeps generated TypeScript identifiers valid for numeric-leading identities", async () => {
    const commandRoot = verifiedDestinationRoot(await tempRoot());
    const commandRequest = must(parseOfficialCommandAuthoringRequest({
      topic: "1demo", name: "inspect", workspaceCwd: commandRoot, dryRun: false,
    }));
    expect((await authorOfficialCommand(commandRequest, { verifyWorkspace: async () => commandRoot })).kind)
      .toBe("AuthoringAuthored");
    expect(await fs.readFile(
      path.join(commandRoot, "apps", "cli", "src", "commands", "1demo", "inspect.ts"),
      "utf8",
    )).toContain("class Rawr1demoInspectCommand extends RawrCommand");

    const extensionParent = await tempRoot();
    const extensionRoot = path.join(extensionParent, "extension");
    const extensionRequest = must(parseExternalExtensionAuthoringRequest({
      extensionId: "123-tools", destination: extensionRoot, operatorCwd: extensionParent, dryRun: false,
    }));
    expect((await authorExternalExtension(extensionRequest)).kind).toBe("AuthoringAuthored");
    expect(await fs.readFile(
      path.join(extensionRoot, "src", "commands", "123-tools", "hello.ts"),
      "utf8",
    )).toContain("class Rawr123ToolsHello extends Command");
  });

  it("maps distinct command topic/name pairs to distinct behavior-test paths", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const first = must(parseOfficialCommandAuthoringRequest({
      topic: "foo-bar", name: "baz", workspaceCwd: root, dryRun: false,
    }));
    const second = must(parseOfficialCommandAuthoringRequest({
      topic: "foo", name: "bar-baz", workspaceCwd: root, dryRun: false,
    }));

    expect((await authorOfficialCommand(first, { verifyWorkspace: async () => root })).kind)
      .toBe("AuthoringAuthored");
    expect((await authorOfficialCommand(second, { verifyWorkspace: async () => root })).kind)
      .toBe("AuthoringAuthored");
    await fs.access(path.join(root, "apps", "cli", "test", "generated", "foo-bar", "baz.test.ts"));
    await fs.access(path.join(root, "apps", "cli", "test", "generated", "foo", "bar-baz.test.ts"));
  });

  it("creates a portable external extension and blocks a divergent planned path", async () => {
    const parent = await tempRoot();
    const destination = path.join(parent, "extension");
    const request = must(parseExternalExtensionAuthoringRequest({
      extensionId: "demo-tools", destination, operatorCwd: parent, dryRun: false,
    }));
    expect((await authorExternalExtension(request)).kind).toBe("AuthoringAuthored");
    const packageJson = JSON.parse(await fs.readFile(path.join(destination, "package.json"), "utf8"));
    expect(packageJson.oclif.commands).toBe("./dist/commands");
    expect(JSON.stringify(packageJson)).not.toContain("workspace:");
    const firstSnapshot = await treeSnapshot(destination);
    expect((await authorExternalExtension(request)).kind).toBe("AuthoringConverged");
    expect(await treeSnapshot(destination)).toEqual(firstSnapshot);
    await fs.writeFile(path.join(destination, "README.md"), "divergent\n");
    expect((await authorExternalExtension(request)).kind).toBe("AuthoringRejected");
  });

  it("rejects a missing extension destination below a symbolic-link ancestor", async () => {
    const operatorRoot = await tempRoot();
    const outside = await tempRoot();
    await fs.mkdir(path.join(outside, "existing"));
    await fs.symlink(outside, path.join(operatorRoot, "alias"), "dir");
    const destination = path.join(operatorRoot, "alias", "existing", "extension");
    const request = must(parseExternalExtensionAuthoringRequest({
      extensionId: "demo-tools", destination, operatorCwd: operatorRoot, dryRun: false,
    }));

    expect(await authorExternalExtension(request)).toMatchObject({
      kind: "AuthoringRejected",
      issues: [{ code: "INVALID_DESTINATION", path: "destination" }],
    });
    await expect(fs.access(path.join(outside, "existing", "extension"))).rejects.toThrow();
  });

  it("authors content-only agent source through the versioned content-workspace interface", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    const request = must(parseCuratedAgentPluginAuthoringRequest({
      pluginId: "research-kit", contentWorkspace: root, dryRun: false,
    }));
    const verifyContentWorkspace = async () => Object.freeze({
      protocol: CONTENT_WORKSPACE_PROTOCOL,
      root,
      repositoryIdentity: "rawr-ai/rawr-hq" as const,
    });
    const authored = await authorCuratedAgentPlugin(request, { verifyContentWorkspace });
    expect(authored.kind).toBe("AuthoringAuthored");
    const pluginRoot = path.join(root, "plugins", "agents", "research-kit");
    const files = await recursiveFiles(pluginRoot);
    expect(files).toEqual([
      "agents/research-kit.md",
      "evaluation/policy.json",
      "package.json",
      "skills/research-kit/SKILL.md",
      "vendor/provenance.json",
    ]);
    expect(JSON.parse(await fs.readFile(path.join(pluginRoot, "package.json"), "utf8"))).toMatchObject({
      name: "@rawr/plugin-research-kit",
      rawr: {
        kind: "agent",
        pluginContent: { version: 1 },
        capability: "research-kit",
      },
    });
    expect(files.some((file) => file.includes("release") || file.includes("provider"))).toBe(false);
    const firstSnapshot = await treeSnapshot(pluginRoot);
    expect((await authorCuratedAgentPlugin(request, { verifyContentWorkspace })).kind).toBe("AuthoringConverged");
    expect(await treeSnapshot(pluginRoot)).toEqual(firstSnapshot);
  });

  it("rejects an agent plugin leaf already owned by another plugin root", async () => {
    const root = verifiedDestinationRoot(await tempRoot());
    await fs.mkdir(path.join(root, "plugins", "cli", "research-kit"), { recursive: true });
    const request = must(parseCuratedAgentPluginAuthoringRequest({
      pluginId: "research-kit", contentWorkspace: root, dryRun: false,
    }));
    const verifyContentWorkspace = async () => Object.freeze({
      protocol: CONTENT_WORKSPACE_PROTOCOL,
      root,
      repositoryIdentity: "rawr-ai/rawr-hq" as const,
    });

    expect(await authorCuratedAgentPlugin(request, { verifyContentWorkspace })).toMatchObject({
      kind: "AuthoringRejected",
      issues: [{ code: "IDENTITY_COLLISION", path: "id" }],
    });
    await expect(fs.access(path.join(root, "plugins", "agents", "research-kit"))).rejects.toThrow();
  });

  it("accepts only the exact personal content repository identity", async () => {
    const personal = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq.git",
      packageName: "rawr-hq",
    });
    const template = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq-template.git",
      packageName: "rawr-hq-template",
      cliPackageName: "@rawr/cli",
    });
    const foreign = await gitFixture({
      origin: "https://github.com/example/foreign.git",
      packageName: "rawr-hq",
    });

    await expect(verifyContentWorkspaceV1(personal)).resolves.toMatchObject({
      protocol: CONTENT_WORKSPACE_PROTOCOL,
      repositoryIdentity: "rawr-ai/rawr-hq",
      root: personal,
    });
    await expect(verifyContentWorkspaceV1(template)).rejects.toThrow(/exact personal/u);
    await expect(verifyContentWorkspaceV1(foreign)).rejects.toThrow(/exact personal/u);
  });

  it("accepts only the exact Template controller repository identity", async () => {
    const template = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq-template.git",
      packageName: "rawr-hq-template",
      cliPackageName: "@rawr/cli",
    });
    const personal = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq.git",
      packageName: "rawr-hq",
      cliPackageName: "@rawr/cli",
    });
    const foreign = await gitFixture({
      origin: "https://github.com/example/foreign.git",
      packageName: "rawr-hq-template",
      cliPackageName: "@rawr/cli",
    });

    await expect(verifyOfficialCommandTemplateWorkspace(template)).resolves.toBe(template);
    await expect(verifyOfficialCommandTemplateWorkspace(personal)).rejects.toThrow(/exact RAWR HQ-Template/u);
    await expect(verifyOfficialCommandTemplateWorkspace(foreign)).rejects.toThrow(/exact RAWR HQ-Template/u);
  });
});

async function tempRoot(): Promise<string> {
  const created = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-authoring-test-"));
  const root = await fs.realpath(created);
  tempRoots.push(root);
  return root;
}

async function removeTempRoot(root: string): Promise<void> {
  const expectedParent = await fs.realpath(os.tmpdir());
  const actualParent = await fs.realpath(path.dirname(root));
  const stat = await fs.lstat(root);
  if (
    actualParent !== expectedParent
    || !path.basename(root).startsWith("rawr-authoring-test-")
    || !stat.isDirectory()
    || stat.isSymbolicLink()
  ) {
    throw new Error("Refusing cleanup outside an owned authoring fixture root");
  }
  await removeDirectoryContents(root);
  await fs.rmdir(root);
}

async function removeDirectoryContents(directory: string): Promise<void> {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      await removeDirectoryContents(target);
      await fs.rmdir(target);
    } else {
      await fs.unlink(target);
    }
  }
}

function must<T>(result: Readonly<{ ok: true; value: T }> | Readonly<{ ok: false }>): T {
  if (!result.ok) throw new Error("Expected valid authoring request fixture");
  return result.value;
}

async function recursiveFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else output.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  await visit(root);
  return output.sort();
}

async function gitFixture(input: Readonly<{
  origin: string;
  packageName: string;
  cliPackageName?: string;
}>): Promise<string> {
  const root = await tempRoot();
  await fs.writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: input.packageName })}\n`);
  if (input.cliPackageName) {
    await fs.mkdir(path.join(root, "apps", "cli"), { recursive: true });
    await fs.writeFile(
      path.join(root, "apps", "cli", "package.json"),
      `${JSON.stringify({ name: input.cliPackageName })}\n`,
    );
  }
  for (const args of [
    ["init", "--quiet"],
    ["remote", "add", "origin", input.origin],
  ]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  }
  return root;
}

async function treeSnapshot(root: string): Promise<Readonly<Record<string, Readonly<{
  bytes: readonly number[];
  mtimeNs: string;
}>>>> {
  const snapshot: Record<string, { bytes: readonly number[]; mtimeNs: string }> = {};
  for (const relativePath of await recursiveFiles(root)) {
    const absolutePath = path.join(root, ...relativePath.split("/"));
    const [bytes, stat] = await Promise.all([
      fs.readFile(absolutePath),
      fs.stat(absolutePath, { bigint: true }),
    ]);
    snapshot[relativePath] = Object.freeze({
      bytes: Object.freeze([...bytes]),
      mtimeNs: stat.mtimeNs.toString(),
    });
  }
  return Object.freeze(snapshot);
}
