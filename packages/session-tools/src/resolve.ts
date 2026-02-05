import path from "node:path";
import fs from "node:fs/promises";
import { getClaudeProjectsDir, listCodexSessionFiles, pathExists } from "./paths";
import { detectSessionFormat } from "./detect";
import { getClaudeSessionMetadata } from "./claude/parse";
import { getCodexSessionMetadata, inferStatusFromPath } from "./codex/parse";
import type { ResolveResult, SessionSourceFilter } from "./types";

function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\\\") || input.endsWith(".jsonl") || input.endsWith(".json");
}

export async function resolveSession(session: string, source: SessionSourceFilter): Promise<ResolveResult | { error: string }> {
  const clean = session.trim();
  let resolvedPath: string | null = null;
  let status: ResolveResult["resolved"]["status"] | undefined;

  if (looksLikePath(clean)) {
    const p = path.resolve(clean);
    if (await pathExists(p)) resolvedPath = p;
    else return { error: `Session not found: ${session}` };
  } else {
    if (source === "claude" || source === "all") {
      const projectsDir = getClaudeProjectsDir();
      if (await pathExists(projectsDir)) {
        const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (!d.isDirectory()) continue;
          const projectDir = path.join(projectsDir, d.name);
          const candidate = path.join(projectDir, `${clean}.jsonl`);
          if (await pathExists(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }
      }
    }
    if (!resolvedPath && (source === "codex" || source === "all")) {
      const codexFiles = await listCodexSessionFiles();
      const needle = clean.toLowerCase();
      for (const f of codexFiles) {
        const stem = path.basename(f.filePath).toLowerCase();
        if (stem.includes(needle)) {
          resolvedPath = f.filePath;
          status = f.status;
          break;
        }
      }
    }
  }

  if (!resolvedPath) return { error: `Session not found: ${session}` };

  const fmt = await detectSessionFormat(resolvedPath);
  const stat = await fs.stat(resolvedPath);

  if (fmt === "claude") {
    const meta = await getClaudeSessionMetadata(resolvedPath);
    return {
      resolved: {
        path: resolvedPath,
        source: "claude",
        modified: new Date(stat.mtimeMs).toISOString(),
        sizeBytes: stat.size,
      },
      metadata: meta,
    };
  }

  const meta = await getCodexSessionMetadata(resolvedPath);
  return {
    resolved: {
      path: resolvedPath,
      source: "codex",
      status: status ?? (await inferStatusFromPath(resolvedPath)),
      modified: new Date(stat.mtimeMs).toISOString(),
      sizeBytes: stat.size,
    },
    metadata: meta,
  };
}

