import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function getCodexHomeDirs(): string[] {
  const homes: string[] = [];
  const envHome = process.env.CODEX_HOME;
  if (envHome && envHome.trim()) homes.push(envHome.trim());
  homes.push(path.join(os.homedir(), ".codex"));
  homes.push(path.join(os.homedir(), ".codex-rawr"));
  return [...new Set(homes)];
}

export type CodexSessionFile = { filePath: string; status: "live" | "archived" };

async function* walkFiles(rootDir: string): AsyncGenerator<string> {
  const stack: string[] = [rootDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let dirents: Array<import("node:fs").Dirent>;
    try {
      dirents = (await fs.readdir(dir, { withFileTypes: true })) as unknown as Array<import("node:fs").Dirent>;
    } catch {
      continue;
    }
    for (const ent of dirents) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(abs);
      else if (ent.isFile()) yield abs;
    }
  }
}

export async function listCodexSessionFiles(): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  const seen = new Set<string>();
  for (const home of getCodexHomeDirs()) {
    const live = path.join(home, "sessions");
    const archived = path.join(home, "archived_sessions");
    const sources: Array<{ dir: string; status: "live" | "archived" }> = [
      { dir: live, status: "live" },
      { dir: archived, status: "archived" },
    ];
    for (const src of sources) {
      if (!(await pathExists(src.dir))) continue;
      for await (const f of walkFiles(src.dir)) {
        if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
        if (seen.has(f)) continue;
        seen.add(f);
        out.push({ filePath: f, status: src.status });
      }
    }
  }
  return out;
}
