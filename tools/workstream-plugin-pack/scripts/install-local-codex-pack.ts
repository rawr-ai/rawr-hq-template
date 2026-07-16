#!/usr/bin/env bun
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
function repoRoot(): string {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  if (!existsSync(join(root, ".git")) || !existsSync(join(root, "package.json"))) {
    throw new Error(`installer is not running from a RAWR HQ-Template checkout: ${root}`);
  }
  return root;
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

function isInside(root: string, candidate: string): boolean {
  const candidateRelative = relative(root, candidate);
  return candidateRelative !== ""
    && candidateRelative !== ".."
    && !candidateRelative.startsWith(`..${sep}`)
    && !isAbsolute(candidateRelative);
}

function lstatIfPresent(entryPath: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(entryPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

function assertOwnedProjectionTarget(
  root: string,
  target: string,
  allowedTargets: ReadonlySet<string>,
): void {
  const normalizedRoot = resolve(root);
  const normalizedTarget = resolve(target);
  if (!allowedTargets.has(normalizedTarget) || !isInside(normalizedRoot, normalizedTarget)) {
    throw new Error(`refusing unowned projection target: ${target}`);
  }

  let cursor = normalizedRoot;
  for (const segment of relative(normalizedRoot, normalizedTarget).split(sep)) {
    cursor = join(cursor, segment);
    if (lstatIfPresent(cursor)?.isSymbolicLink()) {
      throw new Error(`refusing aliased projection target: ${cursor}`);
    }
  }

  let existingAncestor = normalizedTarget;
  while (!lstatIfPresent(existingAncestor)) existingAncestor = dirname(existingAncestor);
  const canonicalRoot = realpathSync(normalizedRoot);
  const canonicalAncestor = realpathSync(existingAncestor);
  if (canonicalAncestor !== canonicalRoot && !isInside(canonicalRoot, canonicalAncestor)) {
    throw new Error(`refusing projection outside repository: ${target}`);
  }
}

function copyTree(
  root: string,
  source: string,
  target: string,
  allowedTargets: ReadonlySet<string>,
  dryRun: boolean,
): void {
  if (!existsSync(source)) throw new Error(`missing source: ${source}`);
  assertOwnedProjectionTarget(root, target, allowedTargets);
  logCopy(source, target);
  if (dryRun) return;
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function writeOwnedFile(
  root: string,
  target: string,
  content: string,
  allowedTargets: ReadonlySet<string>,
  dryRun: boolean,
): void {
  assertOwnedProjectionTarget(root, target, allowedTargets);
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

function parseArgs(argv: string[]): { dryRun: boolean } {
  for (const arg of argv) {
    if (arg !== "--dry-run") throw new Error(`unsupported argument: ${arg}`);
  }
  return { dryRun: argv.includes("--dry-run") };
}

function projectLocal(root: string, packRoot: string, dryRun: boolean): void {
  const allowedTargets = new Set([
    ...SKILLS.map((skill) => resolve(root, ".agents", "skills", skill)),
    ...AGENTS.map((agent) => resolve(root, ".codex", "agents", `${agent.name}.toml`)),
    ...HOOK_FILES.map((hookFile) => resolve(root, ".codex", "hooks", hookFile)),
    resolve(root, ".codex", "hooks.json"),
  ]);

  for (const skill of SKILLS) {
    copyTree(
      root,
      join(packRoot, "skills", skill),
      join(root, ".agents", "skills", skill),
      allowedTargets,
      dryRun,
    );
  }

  for (const agent of AGENTS) {
    const brief = read(join(packRoot, "agents", agent.source));
    writeOwnedFile(
      root,
      join(root, ".codex", "agents", `${agent.name}.toml`),
      codexAgentToml(agent.name, agent.description, brief),
      allowedTargets,
      dryRun,
    );
  }

  for (const hookFile of HOOK_FILES) {
    copyTree(
      root,
      join(packRoot, "hooks", hookFile),
      join(root, ".codex", "hooks", hookFile),
      allowedTargets,
      dryRun,
    );
  }

  writeOwnedFile(
    root,
    join(root, ".codex", "hooks.json"),
    localHooksJson(),
    allowedTargets,
    dryRun,
  );
}

const { dryRun } = parseArgs(process.argv.slice(2));
const root = repoRoot();
const packRoot = join(root, ...PACK_ROOT);
projectLocal(root, packRoot, dryRun);

if (!dryRun) {
  console.log("Workstream Plugin Pack local projection complete.");
}
