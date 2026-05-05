import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";
import type { AgentConfigSyncResources } from "../src/service/shared/resources";
import type { SourceContent, SourcePlugin } from "../src/types";

export function createFakeResources(): AgentConfigSyncResources {
  return {
    files: {
      pathExists: async () => false,
      readTextFile: async () => null,
      writeTextFile: async () => {},
      readJsonFile: async () => null,
      writeJsonFile: async () => {},
      ensureDir: async () => {},
      filesIdentical: async () => false,
      dirsIdentical: async () => false,
      copyFile: async () => {},
      copyDirTree: async () => {},
      removePath: async () => {},
      statPathKind: async () => null,
      readDir: async () => [],
    },
    path,
  };
}

export function createNodeTestResources(): AgentConfigSyncResources {
  async function pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async function listFilesRecursive(rootPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(absDir: string): Promise<void> {
      const dirents = await fs.readdir(absDir, { withFileTypes: true });
      for (const dirent of dirents) {
        const absPath = path.join(absDir, dirent.name);
        if (dirent.isDirectory()) {
          await walk(absPath);
          continue;
        }
        if (dirent.isFile()) files.push(absPath);
      }
    }

    if (!(await pathExists(rootPath))) return files;
    await walk(rootPath);
    return files.sort((a, b) => a.localeCompare(b));
  }

  return {
    files: {
      pathExists,
      readTextFile: async (filePath) => {
        try {
          return await fs.readFile(filePath, "utf8");
        } catch {
          return null;
        }
      },
      writeTextFile: async (filePath, content) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf8");
      },
      readJsonFile: async <T>(filePath: string) => {
        try {
          return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
        } catch {
          return null;
        }
      },
      writeJsonFile: async (filePath, data) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      },
      ensureDir: async (dirPath) => {
        await fs.mkdir(dirPath, { recursive: true });
      },
      filesIdentical: async (leftPath, rightPath) => {
        if (!(await pathExists(leftPath)) || !(await pathExists(rightPath))) return false;
        const [left, right] = await Promise.all([fs.readFile(leftPath), fs.readFile(rightPath)]);
        return left.equals(right);
      },
      dirsIdentical: async (leftPath, rightPath) => {
        const [leftFiles, rightFiles] = await Promise.all([listFilesRecursive(leftPath), listFilesRecursive(rightPath)]);
        const leftRelative = leftFiles.map((filePath) => path.relative(leftPath, filePath));
        const rightRelative = rightFiles.map((filePath) => path.relative(rightPath, filePath));
        if (JSON.stringify(leftRelative) !== JSON.stringify(rightRelative)) return false;
        for (const relPath of leftRelative) {
          const [left, right] = await Promise.all([
            fs.readFile(path.join(leftPath, relPath)),
            fs.readFile(path.join(rightPath, relPath)),
          ]);
          if (!left.equals(right)) return false;
        }
        return true;
      },
      copyFile: async (sourcePath, destinationPath) => {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.copyFile(sourcePath, destinationPath);
      },
      copyDirTree: async (sourceDir, destinationDir) => {
        for (const sourceFile of await listFilesRecursive(sourceDir)) {
          const relPath = path.relative(sourceDir, sourceFile);
          const destinationFile = path.join(destinationDir, relPath);
          await fs.mkdir(path.dirname(destinationFile), { recursive: true });
          await fs.copyFile(sourceFile, destinationFile);
        }
      },
      removePath: async (targetPath, options) => {
        await fs.rm(targetPath, { recursive: options?.recursive ?? false, force: true });
      },
      statPathKind: async (targetPath) => {
        try {
          const stat = await fs.stat(targetPath);
          return stat.isDirectory() ? "dir" : "file";
        } catch {
          return null;
        }
      },
      readDir: async (targetPath) => {
        try {
          const dirents = await fs.readdir(targetPath, { withFileTypes: true });
          return dirents.map((dirent) => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
          }));
        } catch {
          return [];
        }
      },
    },
    path,
  };
}

export function createClientOptions(input: {
  repoRoot?: string;
  resources?: AgentConfigSyncResources;
} = {}): CreateClientOptions {
  const deps: Service["Deps"] = {
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: input.resources ?? createFakeResources(),
  };

  return {
    deps,
    scope: {
      repoRoot: input.repoRoot ?? "/tmp/workspace",
    },
    config: {},
  };
}

export type ParityWorkspace = {
  workspaceRoot: string;
  pluginRoot: string;
  sourcePlugin: SourcePlugin;
  content: SourceContent;
};

export async function makeParityWorkspace(input: {
  pluginName?: string;
  packageName?: string;
  agentFrontmatter?: Record<string, unknown>;
} = {}): Promise<ParityWorkspace> {
  const pluginName = input.pluginName ?? "plugin-demo";
  const packageName = input.packageName ?? "@rawr/plugin-demo";
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-parity-ws-"));
  const pluginRoot = path.join(workspaceRoot, "plugins", "cli", pluginName);
  const workflowPath = path.join(pluginRoot, "workflows", "hello.md");
  const skillRoot = path.join(pluginRoot, "skills", "demo-skill");
  const scriptPath = path.join(pluginRoot, "scripts", "demo.sh");
  const agentPath = path.join(pluginRoot, "agents", "researcher.md");

  await Promise.all([
    fs.mkdir(path.dirname(workflowPath), { recursive: true }),
    fs.mkdir(skillRoot, { recursive: true }),
    fs.mkdir(path.dirname(scriptPath), { recursive: true }),
    fs.mkdir(path.dirname(agentPath), { recursive: true }),
  ]);

  await fs.writeFile(path.join(workspaceRoot, "package.json"), JSON.stringify({ name: "workspace" }), "utf8");
  await fs.writeFile(
    path.join(pluginRoot, "package.json"),
    JSON.stringify({
      name: packageName,
      version: "1.2.3",
      description: "Demo plugin",
      rawr: { kind: "toolkit", capability: "demo" },
    }),
    "utf8",
  );
  await fs.writeFile(workflowPath, "# hello\n", "utf8");
  await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Demo Skill\n", "utf8");
  await fs.writeFile(scriptPath, "echo demo\n", "utf8");

  const frontmatter = input.agentFrontmatter ?? { description: "Research helper" };
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? JSON.stringify(value) : JSON.stringify(value)}`)
    .join("\n");
  await fs.writeFile(agentPath, `---\n${yaml}\n---\nFollow the evidence.\n`, "utf8");

  return {
    workspaceRoot,
    pluginRoot,
    sourcePlugin: {
      ref: pluginName,
      absPath: pluginRoot,
      dirName: pluginName,
      packageName,
      description: "Demo plugin",
      version: "1.2.3",
      rawrKind: "toolkit",
    },
    content: {
      workflowFiles: [{ name: "hello", absPath: workflowPath }],
      skills: [{ name: "demo-skill", absPath: skillRoot }],
      scripts: [{ name: "demo.sh", absPath: scriptPath }],
      agentFiles: [{ name: "researcher", absPath: agentPath }],
      hooks: [],
      hookConfigs: [],
      mcpServers: [],
      settings: [],
      assets: [],
      orchestration: [],
    },
  };
}

export async function makeHyperresearchLikeWorkspace(): Promise<ParityWorkspace> {
  const workspace = await makeParityWorkspace({
    pluginName: "synthetic-hyperresearch",
    packageName: "@rawr/synthetic-hyperresearch",
    agentFrontmatter: {
      description: "Synthetic depth investigator",
      tools: ["Read", "Write", "Task"],
      hooks: ["PreToolUse"],
      mcpServers: { syntheticResearch: {} },
      permissionMode: "acceptEdits",
      skills: ["synthetic-hyperresearch-1-decompose"],
      model: "claude-opus-4-1",
      color: "purple",
    },
  });
  const entrySkill = path.join(workspace.pluginRoot, "skills", "synthetic-hyperresearch");
  const stepOne = path.join(workspace.pluginRoot, "skills", "synthetic-hyperresearch-1-decompose");
  const stepTwo = path.join(workspace.pluginRoot, "skills", "synthetic-hyperresearch-2-width");
  const hookPath = path.join(workspace.pluginRoot, "hooks", "pre-tool-use.mjs");
  const hookHelperPath = path.join(workspace.pluginRoot, "hooks", "hook-helper.mjs");
  const hookConfigPath = path.join(workspace.pluginRoot, "hooks", "hooks.json");
  const hookReadmePath = path.join(workspace.pluginRoot, "hooks", "README.md");
  const mcpPath = path.join(workspace.pluginRoot, "mcp", "synthetic-research.mjs");
  const settingsPath = path.join(workspace.pluginRoot, "settings", "codex", "config.toml");
  const assetPath = path.join(workspace.pluginRoot, "assets", "icon.txt");

  await Promise.all([
    fs.mkdir(entrySkill, { recursive: true }),
    fs.mkdir(stepOne, { recursive: true }),
    fs.mkdir(stepTwo, { recursive: true }),
    fs.mkdir(path.dirname(hookPath), { recursive: true }),
    fs.mkdir(path.dirname(mcpPath), { recursive: true }),
    fs.mkdir(path.dirname(settingsPath), { recursive: true }),
    fs.mkdir(path.dirname(assetPath), { recursive: true }),
  ]);

  await fs.writeFile(path.join(entrySkill, "SKILL.md"), [
    "---",
    "name: synthetic-hyperresearch",
    "description: Synthetic entry point for parity tests.",
    "---",
    "Use TodoWrite to track all 16 steps.",
    "Skill(skill: \"synthetic-hyperresearch-1-decompose\")",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(path.join(stepOne, "SKILL.md"), [
    "---",
    "name: synthetic-hyperresearch-1-decompose",
    "description: Synthetic step one.",
    "---",
    "Task(subagent_type: \"researcher\", prompt: \"map loci\")",
    "Skill(skill: \"synthetic-hyperresearch-2-width\")",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(path.join(stepTwo, "SKILL.md"), [
    "---",
    "name: synthetic-hyperresearch-2-width",
    "description: Synthetic step two.",
    "---",
    "Return a deterministic evidence digest.",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(hookPath, [
    "import { hookEventName } from './hook-helper.mjs';",
    "const chunks = [];",
    "process.stdin.on('data', (chunk) => chunks.push(chunk));",
    "process.stdin.on('end', () => {",
    "  const input = chunks.join('') || '{}';",
    "  process.stdout.write(JSON.stringify({ ok: true, received: hookEventName(JSON.parse(input)) }));",
    "});",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(hookHelperPath, [
    "export function hookEventName(input) {",
    "  return input.hook_event_name ?? null;",
    "}",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(hookReadmePath, "# Synthetic hook notes\n", "utf8");
  await fs.writeFile(hookConfigPath, `${JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command: "node \"$(git rev-parse --show-toplevel)/plugins/agents/synthetic-hyperresearch/hooks/pre-tool-use.mjs\"",
              timeout: 30,
            },
          ],
        },
      ],
    },
  }, null, 2)}\n`, "utf8");
  await fs.writeFile(mcpPath, [
    "process.stdin.on('data', () => {",
    "  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'synthetic_search' }] } }) + '\\n');",
    "});",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(settingsPath, "[features]\ncodex_hooks = true\n", "utf8");
  await fs.writeFile(assetPath, "synthetic asset\n", "utf8");

  workspace.content.skills = [
    { name: "synthetic-hyperresearch", absPath: entrySkill },
    { name: "synthetic-hyperresearch-1-decompose", absPath: stepOne },
    { name: "synthetic-hyperresearch-2-width", absPath: stepTwo },
  ];
  workspace.content.hooks = [
    { name: "hook-helper.mjs", absPath: hookHelperPath },
    { name: "pre-tool-use.mjs", absPath: hookPath },
  ];
  workspace.content.hookConfigs = [{ name: "hooks.json", absPath: hookConfigPath }];
  workspace.content.mcpServers = [{ name: "synthetic-research.mjs", absPath: mcpPath }];
  workspace.content.settings = [{ name: "codex/config.toml", absPath: settingsPath }];
  workspace.content.assets = [{ name: "icon.txt", absPath: assetPath }];
  workspace.content.orchestration = [
    {
      name: "skill:synthetic-hyperresearch",
      absPath: path.join(entrySkill, "SKILL.md"),
      provider: "claude",
      sourceKind: "skill",
      skillInvocations: ["synthetic-hyperresearch-1-decompose"],
      taskSpawns: [],
      todoState: true,
    },
    {
      name: "skill:synthetic-hyperresearch-1-decompose",
      absPath: path.join(stepOne, "SKILL.md"),
      provider: "claude",
      sourceKind: "skill",
      skillInvocations: ["synthetic-hyperresearch-2-width"],
      taskSpawns: ["researcher"],
      todoState: false,
    },
  ];

  return workspace;
}

export async function makeProviderHomes(): Promise<{ codexHome: string; claudeHome: string }> {
  const [codexHome, claudeHome] = await Promise.all([
    fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-codex-home-")),
    fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-claude-home-")),
  ]);
  return { codexHome, claudeHome };
}

export async function snapshotProviderState(rootPath: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};

  async function walk(absDir: string): Promise<void> {
    let dirents: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      dirents = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      const absPath = path.join(absDir, dirent.name);
      if (dirent.isDirectory()) {
        await walk(absPath);
      } else if (dirent.isFile()) {
        snapshot[path.relative(rootPath, absPath)] = await fs.readFile(absPath, "utf8");
      }
    }
  }

  await walk(rootPath);
  return Object.fromEntries(Object.entries(snapshot).sort(([left], [right]) => left.localeCompare(right)));
}
