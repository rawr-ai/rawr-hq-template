#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PACK_ROOT = ["tools", "workstream-plugin-pack"];
const SKILLS = ["workstream-runner", "workstream-review-loops"] as const;
const HOOK_FILES = [
  "workstream_common.ts",
  "workstream_startup.ts",
  "workstream_closure_guard.ts",
] as const;
const AGENTS = [
  {
    name: "workstream-opening-steward",
    source: "workstream-opening-steward.md",
    description: "Workstream setup and opening steward for checking workstream framing, authority, selected capabilities, design lock, and stop conditions.",
  },
  {
    name: "workstream-proof-ledger-auditor",
    source: "workstream-proof-ledger-auditor.md",
    description: "Workstream proof and evidence steward for checking claim strength, evidence homes, waivers, deferred inventory, promotion boundaries, and finding disposition.",
  },
  {
    name: "workstream-closure-steward",
    source: "workstream-closure-steward.md",
    description: "Workstream closure steward for checking outputs, review disposition, scratch cleanup, gates, repo state, deferred inventory, and zero-context Next Packet.",
  },
] as const;
const TARGETS = ["local", "downstream", "all"] as const;
type Target = typeof TARGETS[number];

function repoRoot(): string {
  let current = resolve(process.cwd());
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(process.cwd());
    current = parent;
  }
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlMultiline(value: string): string {
  return `"""\n${value.replace(/"""/g, '\\"\\"\\"').trim()}\n"""`;
}

function logCopy(source: string, target: string): void {
  console.log(`${source} -> ${target}`);
}

function copyTree(source: string, target: string, dryRun: boolean): void {
  if (!existsSync(source)) throw new Error(`missing source: ${source}`);
  logCopy(source, target);
  if (dryRun) return;
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function writeFile(target: string, content: string, dryRun: boolean): void {
  console.log(`write ${target}`);
  if (dryRun) return;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function codexAgentToml(name: string, description: string, brief: string): string {
  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description)}`,
    'sandbox_mode = "read-only"',
    "developer_instructions = " + tomlMultiline(`${brief}

You are the project-scoped Codex installation for this provider-neutral role brief. Stay read-only and follow the brief exactly. Do not edit files, stage changes, commit, spawn agents, submit, push, merge, restack, define programs, define subordinate workstream units, create nested execution models, or set sequence authority.`),
    "",
  ].join("\n");
}

function localHooksJson(): string {
  const source = read(join(repoRoot(), ...PACK_ROOT, "hooks", "hooks.json"));
  return source.replaceAll(
    "tools/workstream-plugin-pack/hooks/",
    ".codex/hooks/",
  );
}

function downstreamHooksJson(pluginRootFromRepoRoot: string): string {
  const source = read(join(repoRoot(), ...PACK_ROOT, "hooks", "hooks.json"));
  return source.replaceAll(
    "tools/workstream-plugin-pack/hooks/",
    `${pluginRootFromRepoRoot}/hooks/`,
  );
}

function downstreamHookSource(packRoot: string, hookFile: string, pluginRootFromRepoRoot: string): string {
  return read(join(packRoot, "hooks", hookFile)).replaceAll(
    "tools/workstream-plugin-pack",
    pluginRootFromRepoRoot,
  );
}

function habitatPackageJson(): string {
  return `${JSON.stringify({
    name: "@rawr/plugin-habitat",
    private: true,
    type: "module",
    packageManager: "bun@1.3.7",
    rawr: {
      kind: "agent",
      pluginContent: {
        version: 1,
      },
      capability: "habitat",
    },
    scripts: {
      lint: "eslint --max-warnings 0 --no-error-on-unmatched-pattern \"**/*.{js,jsx,ts,tsx}\"",
    },
  }, null, 2)}\n`;
}

function habitatReadme(): string {
  return `# Habitat Agent Plugin

Habitat contains coordination-oriented agent runtime material. The current
Workstream content in this plugin is a projected working copy from upstream
\`rawr-hq-template/tools/workstream-plugin-pack/\`.

Do not treat this directory as the source of truth yet. Until
\`agent-config-sync\` supports hook projection and the Workstream plugin has
been used successfully a few times, update the upstream pack first and
re-project this plugin.

## Contents

- \`skills/workstream-runner/\`: Workstream runner skill.
- \`skills/workstream-review-loops/\`: Review-loop skill.
- \`agents/\`: Provider-neutral steward role briefs.
- \`hooks/\`: Provider-specific hook source material. These hooks are not
  synced or activated by this plugin yet.
`;
}

function habitatTodo(): string {
  return `# Habitat Workstream TODO

- Keep upstream \`rawr-hq-template/tools/workstream-plugin-pack/\` as canonical
  for now.
- Re-project this plugin after upstream Workstream pack changes.
- Remove this temporary bridge once \`agent-config-sync\` supports hook
  projection and the Workstream plugin has been used successfully a few times
  without issues.
- Do not sync or install this plugin until that activation path is explicitly
  requested.
`;
}

function parseArgs(argv: string[]): { dryRun: boolean; target: Target; downstreamRoot: string | null } {
  let target: Target = "local";
  let downstreamRoot: string | null = null;
  const dryRun = argv.includes("--dry-run");

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      const value = argv[index + 1];
      if (!TARGETS.includes(value as Target)) {
        throw new Error(`--target must be one of: ${TARGETS.join(", ")}`);
      }
      target = value as Target;
      index += 1;
    } else if (arg === "--downstream-root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--downstream-root requires a path");
      downstreamRoot = resolve(value);
      index += 1;
    }
  }

  return { dryRun, target, downstreamRoot };
}

function defaultDownstreamRoot(root: string): string {
  return resolve(dirname(root), "rawr-hq");
}

function projectLocal(root: string, packRoot: string, dryRun: boolean): void {
  for (const skill of SKILLS) {
    copyTree(
      join(packRoot, "skills", skill),
      join(root, ".agents", "skills", skill),
      dryRun,
    );
  }

  for (const agent of AGENTS) {
    const brief = read(join(packRoot, "agents", agent.source));
    writeFile(
      join(root, ".codex", "agents", `${agent.name}.toml`),
      codexAgentToml(agent.name, agent.description, brief),
      dryRun,
    );
  }

  for (const hookFile of HOOK_FILES) {
    copyTree(
      join(packRoot, "hooks", hookFile),
      join(root, ".codex", "hooks", hookFile),
      dryRun,
    );
  }

  writeFile(join(root, ".codex", "hooks.json"), localHooksJson(), dryRun);
}

function projectDownstream(packRoot: string, downstreamRoot: string, dryRun: boolean): void {
  if (!existsSync(join(downstreamRoot, "plugins", "agents"))) {
    throw new Error(`downstream root does not look like rawr-hq: ${downstreamRoot}`);
  }

  const pluginRoot = join(downstreamRoot, "plugins", "agents", "habitat");
  const pluginRootFromRepoRoot = "plugins/agents/habitat";

  writeFile(join(pluginRoot, "package.json"), habitatPackageJson(), dryRun);
  writeFile(join(pluginRoot, "README.md"), habitatReadme(), dryRun);
  writeFile(join(pluginRoot, "TODO.md"), habitatTodo(), dryRun);

  for (const skill of SKILLS) {
    copyTree(
      join(packRoot, "skills", skill),
      join(pluginRoot, "skills", skill),
      dryRun,
    );
  }

  copyTree(join(packRoot, "agents"), join(pluginRoot, "agents"), dryRun);

  for (const hookFile of HOOK_FILES) {
    const target = join(pluginRoot, "hooks", hookFile);
    console.log(`${join(packRoot, "hooks", hookFile)} -> ${target}`);
    writeFile(
      join(pluginRoot, "hooks", hookFile),
      downstreamHookSource(packRoot, hookFile, pluginRootFromRepoRoot),
      dryRun,
    );
  }
  writeFile(join(pluginRoot, "hooks", "hooks.json"), downstreamHooksJson(pluginRootFromRepoRoot), dryRun);

  console.log(`Projected Workstream Plugin Pack into ${pluginRoot}`);
}

const { dryRun, target, downstreamRoot: explicitDownstreamRoot } = parseArgs(process.argv.slice(2));
const root = repoRoot();
const packRoot = join(root, ...PACK_ROOT);
const downstreamRoot = explicitDownstreamRoot ?? defaultDownstreamRoot(root);

if (target === "local" || target === "all") {
  projectLocal(root, packRoot, dryRun);
}

if (target === "downstream" || target === "all") {
  projectDownstream(packRoot, downstreamRoot, dryRun);
}

if (!dryRun) {
  console.log(`Workstream Plugin Pack projection complete for target: ${target}.`);
}
