#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const findings = [];

const retainedCommands = Object.freeze({
  "apps/cli/src/commands/agent/plugins/create.ts": "agent-plugin",
  "apps/cli/src/commands/cli/command/create.ts": "cli-command",
  "apps/cli/src/commands/cli/extension/create.ts": "cli-extension",
});

const requiredPaths = [
  ...Object.keys(retainedCommands),
  "apps/cli/src/lib/authoring/shared/executor.ts",
  "apps/cli/src/lib/authoring/shared/model.ts",
  "apps/cli/src/lib/authoring/shared/node-port.ts",
  "apps/cli/src/lib/authoring/agent-plugin/application.ts",
  "apps/cli/src/lib/authoring/cli-command/application.ts",
  "apps/cli/src/lib/authoring/cli-extension/application.ts",
  "apps/server/src/hq-ops-binding.ts",
];

const retiredPaths = [
  "apps/cli/src/commands/app/composition/show.ts",
  "apps/cli/src/commands/app/composition/check.ts",
  "apps/cli/src/commands/app/composition/select.ts",
  "apps/cli/src/commands/app/composition/unselect.ts",
  "apps/cli/src/commands/app/projection/create.ts",
  "apps/cli/src/lib/app-composition/index.ts",
  "apps/cli/src/lib/authoring/app-projection/application.ts",
  "apps/web/src/ui/lib/orpc-client.ts",
  "apps/web/src/ui/pages/MountsPage.tsx",
  "apps/web/src/ui/composition/SelectedProjectionOutlets.tsx",
  "apps/server/src/plugins.ts",
  "apps/server/test/app-composition-structure.test.ts",
  "apps/hq/src/composition-metadata.ts",
  "apps/hq/src/projection.ts",
  "apps/hq/src/server.ts",
  "apps/hq/src/web.ts",
  "packages/hq-sdk/src/app-composition.ts",
  "packages/hq-sdk/src/app-composition/index.ts",
  "packages/hq-sdk/src/server-runtime-config.ts",
  "plugins/server/api/state/package.json",
  "services/hq-ops/src/service/modules/repo-state/contract.ts",
  "plugins/cli/plugins/src/lib/factory.ts",
  "plugins/cli/plugins/src/commands/plugins/scaffold/command.ts",
  "plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts",
  "plugins/cli/plugins/src/commands/plugins/scaffold/workflow.ts",
  "plugins/cli/plugins/src/commands/plugins/web/list.ts",
  "plugins/cli/plugins/src/commands/plugins/web/status.ts",
  "plugins/cli/plugins/src/commands/plugins/web/enable.ts",
  "plugins/cli/plugins/src/commands/plugins/web/enable/all.ts",
  "plugins/cli/plugins/src/commands/plugins/web/disable.ts",
  "apps/cli/src/commands/workflow/forge-command.ts",
];

for (const relPath of requiredPaths) {
  if (!(await exists(relPath))) findings.push(`missing retained path: ${relPath}`);
}
for (const relPath of retiredPaths) {
  if (await exists(relPath)) findings.push(`retired path remains active: ${relPath}`);
}

const activeRuntimeRoots = [
  "apps/cli/src",
  "apps/hq",
  "apps/server/src",
  "apps/web/src",
  "services/hq-ops/src",
];
const retiredRuntimeTokens = [
  "@rawr/hq-sdk/app-composition",
  "@rawr/hq-sdk/server-runtime-config",
  "@rawr/plugin-server-api-state",
  "/rawr/composition",
  "/rawr/plugins/web/",
  "createRealizedCompositionObservation",
  "enabledPluginIds",
  "enabledPlugins",
  "loadWorkspaceServerPlugins",
  "mountServerPlugins",
  "repoState.",
];
for (const relRoot of activeRuntimeRoots) {
  for (const relPath of await sourceFilesUnder(relRoot)) {
    const source = await read(relPath);
    for (const token of retiredRuntimeTokens) {
      if (source.includes(token)) findings.push(`${relPath} retains retired runtime token ${token}`);
    }
  }
}

const activeToolAndGuidanceRoots = [
  "apps/cli/src",
  "plugins/agents/hq/skills",
  "docs",
];
const retiredActiveGuidance = [
  ["legacy web-membership command", /\b(?:rawr\s+)?plugins\s+web\b/u],
  ["legacy scaffold command", /\b(?:rawr\s+)?plugins\s+scaffold\b/u],
  ["retired app-projection creator", /\bapp\s+projection\s+create\b/u],
  ["retired app-composition command", /\bapp\s+composition\s+(?:show|check|select|unselect)\b/u],
  ["retired forge-command workflow", /\bworkflow\s+forge-command\b/u],
];
for (const relRoot of activeToolAndGuidanceRoots) {
  for (const relPath of await activeTextFilesUnder(relRoot)) {
    const source = await read(relPath);
    for (const [label, pattern] of retiredActiveGuidance) {
      if (pattern.test(source)) findings.push(`${relPath} retains ${label} guidance or metadata`);
    }
  }
}

const authoringKinds = ["agent-plugin", "cli-command", "cli-extension"];
for (const kind of authoringKinds) {
  for (const relPath of await sourceFilesUnder(`apps/cli/src/lib/authoring/${kind}`)) {
    for (const specifier of importSpecifiers(await read(relPath))) {
      const resolvedSpecifier = resolveImport(relPath, specifier);
      for (const sibling of authoringKinds) {
        if (sibling !== kind && resolvedSpecifier.includes(`/authoring/${sibling}`)) {
          findings.push(`${relPath} imports sibling authoring kind ${sibling}`);
        }
      }
      if (isMutationOwnerImport(specifier)) {
        findings.push(`${relPath} imports lifecycle/runtime owner ${specifier}`);
      }
    }
  }
}

for (const [relPath, owner] of Object.entries(retainedCommands)) {
  const source = await read(relPath);
  const specifiers = importSpecifiers(source);
  if (!specifiers.some((specifier) => specifier.endsWith(`/authoring/${owner}`))) {
    findings.push(`${relPath} does not delegate to its exact authoring owner ${owner}`);
  }
  for (const sibling of authoringKinds) {
    if (sibling !== owner && specifiers.some((specifier) => specifier.includes(`/authoring/${sibling}`))) {
      findings.push(`${relPath} imports sibling authoring kind ${sibling}`);
    }
  }
  for (const specifier of specifiers) {
    if (isMutationOwnerImport(specifier)) {
      findings.push(`${relPath} imports lifecycle/runtime owner ${specifier}`);
    }
  }
}

for (const relPath of await sourceFilesUnder("apps/cli/src/lib/authoring/shared")) {
  const source = await read(relPath);
  for (const forbidden of ["productKind", "outputKind", "parsePlugin", "parseProjection", "parseCommand", "parseExtension"]) {
    if (source.includes(forbidden)) findings.push(`${relPath} dispatches raw product kinds through ${forbidden}`);
  }
}

const governedCreatorFiles = [
  ...await sourceFilesUnder("apps/cli/src/commands/agent"),
  ...await sourceFilesUnder("apps/cli/src/commands/cli"),
].filter((relPath) => path.posix.basename(relPath) === "create.ts").sort();
const expectedCreatorFiles = Object.keys(retainedCommands).sort();
if (JSON.stringify(governedCreatorFiles) !== JSON.stringify(expectedCreatorFiles)) {
  findings.push(
    `qualified creator command set must be exact: expected ${expectedCreatorFiles.join(", ")}; found ${governedCreatorFiles.join(", ")}`,
  );
}

if (findings.length > 0) {
  console.error("legacy membership retirement and qualified authoring gate failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("legacy membership retirement and qualified authoring gate passed");

function isMutationOwnerImport(specifier) {
  return [
    "@rawr/plugin-plugins",
    "agent-plugin-build",
    "agent-plugin-release",
    "agent-plugin-promotion",
    "agent-provider-deployment",
    "app-composition",
    "server-runtime-config",
  ].some((token) => specifier.includes(token));
}

function importSpecifiers(source) {
  return [...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]);
}

function resolveImport(importer, specifier) {
  if (!specifier.startsWith(".")) return specifier;
  return `/${path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier))}`;
}

async function exists(relPath) {
  try {
    await fs.stat(path.join(root, relPath));
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function read(relPath) {
  return await fs.readFile(path.join(root, relPath), "utf8");
}

async function sourceFilesUnder(relRoot) {
  const files = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "dist" && entry.name !== "node_modules") await visit(child);
      } else if (entry.isFile() && /\.[cm]?[jt]sx?$/u.test(entry.name)) {
        files.push(path.relative(root, child).split(path.sep).join("/"));
      }
    }
  }
  await visit(path.join(root, relRoot));
  return files.sort();
}

async function activeTextFilesUnder(relRoot) {
  const files = [];
  const inactiveEvidenceDirectories = new Set(["_archive", "archive", "archives", "quarantine"]);
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!inactiveEvidenceDirectories.has(entry.name.toLowerCase()) && entry.name !== "dist" && entry.name !== "node_modules") {
          await visit(child);
        }
      } else if (entry.isFile() && /\.(?:[cm]?[jt]sx?|mdx?|json|ya?ml|toml)$/u.test(entry.name)) {
        files.push(path.relative(root, child).split(path.sep).join("/"));
      }
    }
  }
  await visit(path.join(root, relRoot));
  return files.sort();
}
