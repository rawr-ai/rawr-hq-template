import fs from "node:fs/promises";
import path from "node:path";

import { listWorkspacePlugins } from "../workspace/plugins";
import { runCommand, tryParseJson } from "./process";
import type { LifecycleCheckData, LifecycleType } from "./types";

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function uniqSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function isTestFile(file: string): boolean {
  return /(^|\/)(test|tests)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

function isDocFile(file: string): boolean {
  return file.endsWith(".md") || file === "README" || file.endsWith("/README") || file.endsWith("/README.md") || file.startsWith("docs/");
}

function isCodeFile(file: string): boolean {
  return !isTestFile(file) && !isDocFile(file);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readPackageName(targetAbs: string): Promise<string | null> {
  const pkgPath = path.join(targetAbs, "package.json");
  if (!(await exists(pkgPath))) return null;

  try {
    const parsed = JSON.parse(await fs.readFile(pkgPath, "utf8")) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

export async function resolveTargetPath(workspaceRoot: string, target: string): Promise<string | null> {
  const candidates = [
    path.isAbsolute(target) ? target : path.resolve(workspaceRoot, target),
    path.resolve(process.cwd(), target),
  ];

  for (const c of candidates) {
    if (await exists(c)) return c;
  }

  const workspacePlugins = await listWorkspacePlugins(workspaceRoot);
  const byId = workspacePlugins.find((p) => p.id === target || p.dirName === target || p.name === target);
  if (byId) return byId.absPath;

  return null;
}

export async function gitTrackedFiles(workspaceRoot: string): Promise<string[]> {
  const r = await runCommand("git", ["ls-files"], { cwd: workspaceRoot });
  if (r.exitCode !== 0) return [];
  return uniqSorted(
    r.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toPosix),
  );
}

export async function collectChangedFiles(workspaceRoot: string, baseRef?: string): Promise<string[]> {
  const out: string[] = [];
  const add = (raw: string) => {
    for (const line of raw.split("\n")) {
      const f = toPosix(line.trim());
      if (f) out.push(f);
    }
  };

  const unstaged = await runCommand("git", ["diff", "--name-only", "--relative"], { cwd: workspaceRoot });
  if (unstaged.exitCode === 0) add(unstaged.stdout);

  const staged = await runCommand("git", ["diff", "--name-only", "--relative", "--cached"], { cwd: workspaceRoot });
  if (staged.exitCode === 0) add(staged.stdout);

  const range = baseRef ? `${baseRef}...HEAD` : "HEAD~1...HEAD";
  const committed = await runCommand("git", ["diff", "--name-only", "--relative", range], { cwd: workspaceRoot });
  if (committed.exitCode === 0) add(committed.stdout);

  return uniqSorted(out);
}

export async function verifySyncAndDrift(workspaceRoot: string): Promise<{
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
}> {
  const sync = await runCommand(
    "bun",
    ["run", "rawr", "--", "plugins", "sync", "all", "--dry-run", "--json"],
    { cwd: workspaceRoot, timeoutMs: 120_000 },
  );

  const drift = await runCommand(
    "bun",
    ["run", "rawr", "--", "plugins", "sync", "drift", "--no-fail-on-drift", "--json"],
    { cwd: workspaceRoot, timeoutMs: 120_000 },
  );

  const driftParsed = tryParseJson<any>(drift.stdout);
  const inSync =
    typeof driftParsed?.data?.summary?.inSync === "boolean"
      ? driftParsed.data.summary.inSync
      : typeof driftParsed?.summary?.inSync === "boolean"
        ? driftParsed.summary.inSync
        : false;

  return {
    syncVerified: sync.exitCode === 0,
    driftVerified: drift.exitCode === 0,
    driftDetected: !inSync,
  };
}

export async function scanDependents(
  workspaceRoot: string,
  targetAbs: string,
  repoFiles: string[],
): Promise<string[]> {
  const targetRel = toPosix(path.relative(workspaceRoot, targetAbs));
  const dirName = path.basename(targetAbs);
  const packageName = await readPackageName(targetAbs);
  const tokens = uniqSorted([dirName, packageName ?? ""]).filter((t) => t.length >= 4);

  if (tokens.length === 0) return [];

  const dependentSet = new Set<string>();
  for (const token of tokens) {
    const r = await runCommand(
      "rg",
      [
        "-l",
        "--fixed-strings",
        "--glob",
        "!**/node_modules/**",
        "--glob",
        "!**/dist/**",
        "--glob",
        "!**/.turbo/**",
        token,
        ".",
      ],
      { cwd: workspaceRoot },
    );

    if (r.exitCode !== 0 && r.exitCode !== 1) continue;

    for (const line of r.stdout.split("\n")) {
      const rel = toPosix(line.trim().replace(/^\.\//, ""));
      if (!rel) continue;
      if (rel === targetRel || rel.startsWith(`${targetRel}/`)) continue;
      if (!repoFiles.includes(rel)) continue;
      dependentSet.add(rel);
    }
  }

  return uniqSorted([...dependentSet]);
}

export async function evaluateLifecycleCompleteness(input: {
  workspaceRoot: string;
  targetInput: string;
  targetAbs: string;
  type: LifecycleType;
  changedFiles: string[];
  repoFiles: string[];
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
}): Promise<LifecycleCheckData> {
  const targetRel = toPosix(path.relative(input.workspaceRoot, input.targetAbs));
  const changed = uniqSorted(input.changedFiles.map(toPosix));

  const relevantChanged =
    input.type === "composed"
      ? changed
      : changed.filter((f) => f === targetRel || f.startsWith(`${targetRel}/`));

  const codeChanged = relevantChanged.filter(isCodeFile);
  const testChanged = changed.filter((f) => isTestFile(f) && (input.type === "composed" || f === targetRel || f.startsWith(`${targetRel}/`)));
  const docsChanged = changed.filter(
    (f) => isDocFile(f) && (input.type === "composed" || f === targetRel || f.startsWith(`${targetRel}/`) || f.startsWith("docs/")),
  );

  const testsRequired = ["cli", "web", "agent", "composed"].includes(input.type) && codeChanged.length > 0;
  const docsRequired = codeChanged.length > 0 || ["skill", "workflow", "composed"].includes(input.type);

  const missingTests = testsRequired && testChanged.length === 0 ? ["no test updates detected for code changes"] : [];
  const missingDocs = docsRequired && docsChanged.length === 0 ? ["no documentation updates detected for changed unit"] : [];

  const dependentFiles = await scanDependents(input.workspaceRoot, input.targetAbs, input.repoFiles);
  const dependentTouched = dependentFiles.length === 0 || dependentFiles.some((d) => changed.includes(d));
  const missingDependents = dependentTouched ? [] : dependentFiles.slice(0, 20);

  const status: LifecycleCheckData["status"] =
    missingTests.length === 0 &&
    missingDocs.length === 0 &&
    missingDependents.length === 0 &&
    input.syncVerified &&
    input.driftVerified
      ? "pass"
      : "fail";

  return {
    status,
    target: {
      input: input.targetInput,
      absPath: input.targetAbs,
      relPath: targetRel,
      type: input.type,
    },
    missingTests,
    missingDocs,
    missingDependents,
    syncVerified: input.syncVerified,
    driftVerified: input.driftVerified,
    driftDetected: input.driftDetected,
    details: {
      changedFilesConsidered: changed,
      relevantChangedFiles: relevantChanged,
      dependentFiles,
      codeChanged,
      testChanged,
      docsChanged,
    },
  };
}
