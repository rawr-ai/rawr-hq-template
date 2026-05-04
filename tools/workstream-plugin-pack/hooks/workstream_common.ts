#!/usr/bin/env bun
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";

export type HookPayload = Record<string, unknown>;

const PACK_ROOT = "tools/workstream-plugin-pack";
const REQUIRED_PACK_FILES = [
  `${PACK_ROOT}/README.md`,
  `${PACK_ROOT}/skills/workstream-runner/SKILL.md`,
  `${PACK_ROOT}/skills/workstream-runner/assets/minimal-workstream-record.md`,
  `${PACK_ROOT}/skills/workstream-runner/assets/workstream-record.md`,
  `${PACK_ROOT}/skills/workstream-review-loops/SKILL.md`,
  `${PACK_ROOT}/agents/workstream-opening-steward.md`,
  `${PACK_ROOT}/agents/workstream-proof-ledger-auditor.md`,
  `${PACK_ROOT}/agents/workstream-closure-steward.md`,
  `${PACK_ROOT}/hooks/workstream_common.ts`,
  `${PACK_ROOT}/hooks/workstream_startup.ts`,
  `${PACK_ROOT}/hooks/workstream_closure_guard.ts`,
];
const REQUIRED_HOOK_EVENTS = ["SessionStart", "Stop"];

export function loadPayload(): HookPayload {
  let raw = "";
  try {
    raw = String(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
  if (!raw.trim()) return {};
  try {
    const payload = JSON.parse(raw);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  } catch {
    return {};
  }
}

export function repoRoot(payload?: HookPayload): string {
  const cwd = typeof payload?.cwd === "string" ? payload.cwd : process.cwd();
  let current = resolve(cwd);
  while (true) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, ".codex"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

export function readText(path: string): string {
  try {
    return String(readFileSync(path, "utf8"));
  } catch {
    return "";
  }
}

function run(root: string, args: string[], timeout = 5000) {
  return spawnSync(args[0], args.slice(1), {
    cwd: root,
    encoding: "utf8",
    timeout,
  });
}

function nulFields(value: string): string[] {
  return value.split("\0").map((item) => item.trim()).filter(Boolean);
}

export function changedFiles(root: string): string[] {
  const files = new Set<string>();
  const status = run(root, ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (status.status === 0) {
    const entries = nulFields(status.stdout);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const path = entry.slice(3);
      if (!path) continue;
      if (entry.startsWith("R") || entry.startsWith("C")) {
        const newPath = entries[index + 1];
        if (newPath) {
          files.add(newPath);
          index += 1;
        } else {
          files.add(path);
        }
        continue;
      }
      files.add(path);
    }
  }
  for (const args of [
    ["git", "diff", "--name-only", "-z"],
    ["git", "diff", "--cached", "--name-only", "-z"],
  ]) {
    const diff = run(root, args);
    if (diff.status === 0) {
      for (const path of nulFields(diff.stdout)) files.add(path);
    }
  }
  return [...files].sort();
}

export function isWorkstreamPackRepo(root: string): boolean {
  return existsSync(join(root, PACK_ROOT, "README.md"))
    || existsSync(join(root, ".agents", "skills", "workstream-runner", "SKILL.md"));
}

export function currentWorkstreamPointer(root: string): Record<string, unknown> | null {
  const pointerPath = join(root, ".workstream", "current.json");
  if (!existsSync(pointerPath)) return null;
  try {
    const data = JSON.parse(readText(pointerPath));
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return { malformed: true, path: ".workstream/current.json" };
  }
}

export function explicitWorkstreamContext(root: string, payload: HookPayload): boolean {
  if (currentWorkstreamPointer(root)) return true;
  const payloadText = JSON.stringify(payload).toLowerCase();
  if (payloadText.includes("workstream")) return true;
  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  return cwd.toLowerCase().includes("workstream");
}

export function continuationIssues(root: string): string[] {
  const pointer = currentWorkstreamPointer(root);
  if (!pointer) return [];
  if (pointer.malformed) return [".workstream/current.json is malformed JSON"];
  const status = String(pointer.status ?? "active").toLowerCase();
  if (!["active", "active-draft", "planning", "implementation", "review"].includes(status)) return [];
  const nextPacket = pointer.next_packet ?? pointer.nextPacket;
  if (typeof nextPacket !== "string" || !nextPacket.trim()) {
    return [".workstream/current.json does not name next_packet / nextPacket"];
  }
  if (!existsSync(join(root, nextPacket))) {
    return [`.workstream/current.json next packet does not exist: ${nextPacket}`];
  }
  return [];
}

function hookCommandTargetsPack(command: string): boolean {
  return command.includes(`${PACK_ROOT}/hooks/`);
}

function packHookConfigIssues(root: string): string[] {
  const issues: string[] = [];
  const relPath = `${PACK_ROOT}/hooks/hooks.json`;
  const path = join(root, relPath);
  if (!existsSync(path)) return [`${relPath} is missing`];
  try {
    const data = JSON.parse(readText(path));
    const hooks = data && typeof data === "object" ? data.hooks : undefined;
    if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) {
      return [`${relPath} must contain a hooks object`];
    }
    for (const event of REQUIRED_HOOK_EVENTS) {
      if (!(event in hooks)) issues.push(`${relPath} missing ${event} hook`);
    }
    const text = JSON.stringify(data);
    if (!hookCommandTargetsPack(text)) {
      issues.push(`${relPath} must invoke tools/workstream-plugin-pack/hooks scripts`);
    }
  } catch (error) {
    issues.push(`${relPath} is invalid JSON: ${String(error)}`);
  }
  return issues;
}

function validateHookSyntax(root: string, relPath: string): string | null {
  const tempDir = mkdtempSync(join(tmpdir(), "workstream-hook-"));
  try {
    const outfile = join(tempDir, "hook.js");
    const result = spawnSync("bun", ["build", relPath, "--target=bun", "--outfile", outfile], {
      cwd: root,
      encoding: "utf8",
      timeout: 8000,
    });
    if (result.status === 0) return null;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    return `${relPath} does not build with bun: ${output}`;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function validateRuntimeBundle(root: string, compileHooks = false): string[] {
  const issues: string[] = [];
  for (const relPath of REQUIRED_PACK_FILES) {
    if (!existsSync(join(root, relPath))) issues.push(`${relPath} is missing`);
  }
  issues.push(...packHookConfigIssues(root));
  if (compileHooks) {
    for (const relPath of REQUIRED_PACK_FILES.filter((path) => path.startsWith(`${PACK_ROOT}/hooks/`) && path.endsWith(".ts"))) {
      const syntaxIssue = validateHookSyntax(root, relPath);
      if (syntaxIssue) issues.push(syntaxIssue);
    }
  }
  return issues;
}

export function runtimeRelated(files: Iterable<string>): string[] {
  return [...files]
    .filter((path) => path.startsWith(PACK_ROOT)
      || path.startsWith(".agents/skills/workstream-")
      || path.startsWith(".codex/agents/workstream-")
      || path === ".codex/hooks.json")
    .sort();
}

export function diffCheck(root: string, files: Iterable<string>): string[] {
  const paths = [...files].filter((path) => existsSync(join(root, path)));
  if (!paths.length) return [];
  const proc = run(root, ["git", "diff", "--check", "--", ...paths], 10000);
  if (proc.status === 0) return [];
  const output = [proc.stdout, proc.stderr].filter(Boolean).join("\n").trim();
  return [`git diff --check failed:\n${output}`];
}

export function warn(message: string): void {
  console.log(JSON.stringify({ continue: true, systemMessage: message, suppressOutput: false }));
}

export function context(message: string): void {
  console.log(JSON.stringify({ continue: true, systemMessage: message, suppressOutput: false }));
}

export function silent(): void {
  return;
}
