import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type ScratchPolicyMode = "off" | "warn" | "block";

export type ScratchPolicyCheck = {
  mode: ScratchPolicyMode;
  bypassed: boolean;
  required: {
    planScratch: boolean;
    workingPad: boolean;
  };
  missing: string[];
  matches: {
    planScratchPaths: string[];
    workingPadPaths: string[];
  };
};

type Dirent = {
  name: string;
  isDirectory: () => boolean;
};

function normalizeMode(input: string | null | undefined): ScratchPolicyMode {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "off") return "off";
  if (value === "block") return "block";
  return "warn";
}

function readModeFromGitConfig(workspaceRoot: string): ScratchPolicyMode | null {
  const run = spawnSync("git", ["config", "--get", "rawr.scratchPolicyMode"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
  if ((run.status ?? 1) !== 0) return null;
  const raw = (run.stdout ?? "").trim();
  if (!raw) return null;
  return normalizeMode(raw);
}

async function listDirSafe(dirPath: string): Promise<Dirent[]> {
  try {
    return (await fs.readdir(dirPath, { withFileTypes: true })) as unknown as Dirent[];
  } catch {
    return [];
  }
}

async function collectScratchFiles(root: string, depth: number): Promise<{ planScratch: string[]; workingPad: string[] }> {
  const out = {
    planScratch: [] as string[],
    workingPad: [] as string[],
  };

  if (depth < 0) return out;
  const dirents = await listDirSafe(root);
  for (const dirent of dirents) {
    const abs = path.join(root, dirent.name);
    if (dirent.isDirectory()) {
      if (dirent.name === "node_modules" || dirent.name === "dist" || dirent.name.startsWith(".")) continue;
      const nested = await collectScratchFiles(abs, depth - 1);
      out.planScratch.push(...nested.planScratch);
      out.workingPad.push(...nested.workingPad);
      continue;
    }

    if (dirent.name === "PLAN_SCRATCH.md") out.planScratch.push(abs);
    if (dirent.name === "WORKING_PAD.md") out.workingPad.push(abs);
  }

  return out;
}

export async function checkScratchPolicy(workspaceRoot: string): Promise<ScratchPolicyCheck> {
  if (process.env.RAWR_SKIP_SCRATCH_POLICY === "1") {
    return {
      mode: "off",
      bypassed: true,
      required: { planScratch: true, workingPad: true },
      missing: [],
      matches: { planScratchPaths: [], workingPadPaths: [] },
    };
  }

  const fromGit = readModeFromGitConfig(workspaceRoot);
  const effectiveMode = process.env.RAWR_SCRATCH_POLICY_MODE
    ? normalizeMode(process.env.RAWR_SCRATCH_POLICY_MODE)
    : fromGit ?? "warn";

  const docsProjectsRoot = path.join(workspaceRoot, "docs", "projects");
  const found = await collectScratchFiles(docsProjectsRoot, 5);
  const required = {
    planScratch: found.planScratch.length > 0,
    workingPad: found.workingPad.length > 0,
  };

  const missing: string[] = [];
  if (!required.planScratch) missing.push("PLAN_SCRATCH.md");
  if (!required.workingPad) missing.push("WORKING_PAD.md");

  return {
    mode: effectiveMode,
    bypassed: false,
    required,
    missing,
    matches: {
      planScratchPaths: found.planScratch.sort((a, b) => a.localeCompare(b)),
      workingPadPaths: found.workingPad.sort((a, b) => a.localeCompare(b)),
    },
  };
}
