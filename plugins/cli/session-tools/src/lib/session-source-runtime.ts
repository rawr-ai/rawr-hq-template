import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { DiscoverSessionsInput, SessionSourceRuntime } from "@rawr/session-intelligence/ports/session-source-runtime";
import type { CodexSessionFile, CodexSessionSource, DiscoveredSessionFile, SessionSource, SessionStatus } from "@rawr/session-intelligence/types";
import { readJsonlObjects } from "./jsonl";
import {
  codexDiscoveryMaxAgeMs,
  expandHomePath,
  getClaudeProjectsDir,
  getCodexHomeDirs,
  pathExists,
} from "./session-paths";

type CodexSource = {
  dir: string;
  status: SessionStatus;
};

type SessionFileCandidate = {
  filePath: string;
  source: SessionSource;
  status?: SessionStatus;
  projectName?: string;
  modifiedMs: number;
  sizeBytes: number;
};

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, "/");
}

function basename(value: string): string {
  const normalized = normalizePathSeparators(value).replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? normalized;
}

function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\") || input.endsWith(".jsonl") || input.endsWith(".json") || input.startsWith("~");
}

function guessClaudeProjectName(dirName: string): string {
  if (dirName.startsWith("-Users-")) {
    const parts = dirName.split("-");
    if (parts.length > 3) return parts.at(-1) || parts.at(-2) || dirName;
  }
  return dirName;
}

function containsFilter(value: string | undefined, needle: string | undefined): boolean {
  return !needle || Boolean(value?.toLowerCase().includes(needle.toLowerCase()));
}

function pushNewestBounded<T extends { modifiedMs: number }>(files: T[], next: T, max: number): void {
  if (files.length < max) {
    files.push(next);
    if (files.length === max) files.sort((a, b) => a.modifiedMs - b.modifiedMs);
    return;
  }
  if (!files.length || next.modifiedMs <= files[0]!.modifiedMs) return;
  files[0] = next;
  files.sort((a, b) => a.modifiedMs - b.modifiedMs);
}

async function* walkFiles(rootDir: string): AsyncGenerator<string> {
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let dirents: Dirent[];
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
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

async function collectCodexSources(): Promise<CodexSource[]> {
  /**
   * The plugin owns concrete Codex home discovery because it depends on local
   * CLI configuration and filesystem layout. The service receives normalized
   * roots and decides how to index them.
   */
  const out: CodexSource[] = [];
  for (const home of getCodexHomeDirs()) {
    const sources: CodexSource[] = [
      { dir: path.join(home, "sessions"), status: "live" },
      { dir: path.join(home, "archived_sessions"), status: "archived" },
    ];
    for (const src of sources) {
      if (await pathExists(src.dir)) out.push(src);
    }
  }
  return out;
}

async function discoverCodexFromFilesystem(sources: CodexSource[], max: number): Promise<SessionFileCandidate[]> {
  /**
   * This remains the monolithic discovery path for callers that do not opt into
   * the service-owned Codex index. It keeps the newest bounded set in memory
   * without forcing the service cache contract onto every runtime.
   */
  const out: SessionFileCandidate[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    for await (const f of walkFiles(src.dir)) {
      if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
      if (seen.has(f)) continue;
      seen.add(f);
      const stat = await fs.stat(f).catch(() => null);
      if (!stat) continue;
      const next: SessionFileCandidate = {
        filePath: f,
        source: "codex",
        status: src.status,
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
      if (max) pushNewestBounded(out, next, max);
      else out.push(next);
    }
  }
  return out.sort((a, b) => b.modifiedMs - a.modifiedMs);
}

async function discoverCodexFilesForSource(source: CodexSessionSource): Promise<CodexSessionFile[]> {
  /**
   * Root-scoped enumeration is intentionally dumb: return current files and
   * stats only. Refresh cadence, stale-row pruning, and query limits belong to
   * the service catalog repository.
   */
  const files: CodexSessionFile[] = [];
  for await (const f of walkFiles(source.dir)) {
    if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
    const stat = await fs.stat(f).catch(() => null);
    if (!stat) continue;
    files.push({
      path: f,
      status: source.status,
      modifiedMs: stat.mtimeMs,
      sizeBytes: stat.size,
    });
  }
  return files.sort((a, b) => b.modifiedMs - a.modifiedMs);
}

async function discoverCodexCandidates(limit?: number): Promise<SessionFileCandidate[]> {
  const max = typeof limit === "number" && limit > 0 ? limit : 0;
  const sources = await collectCodexSources();
  if (!sources.length) return [];
  return discoverCodexFromFilesystem(sources, max);
}

async function discoverClaudeCandidates(input: { project?: string; limit?: number }): Promise<SessionFileCandidate[]> {
  const candidates: SessionFileCandidate[] = [];
  const projectsDir = getClaudeProjectsDir();
  if (!(await pathExists(projectsDir))) return [];
  const projectFilter = input.project ? String(input.project).trim() : "";
  const absoluteProjectDir =
    projectFilter && looksLikePath(projectFilter) ? path.resolve(expandHomePath(projectFilter)) : null;
  const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith(".")) continue;
    const projectDir = absoluteProjectDir ?? path.join(projectsDir, d.name);
    if (!absoluteProjectDir && projectFilter) {
      const guessed = guessClaudeProjectName(d.name);
      if (!containsFilter(d.name, projectFilter) && !containsFilter(guessed, projectFilter)) continue;
    }
    if (absoluteProjectDir && projectDir !== absoluteProjectDir) continue;
    const files = await fs.readdir(projectDir).catch(() => []);
    for (const f of files) {
      if (!f.endsWith(".jsonl") || f.startsWith("agent-")) continue;
      const abs = path.join(projectDir, f);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat) continue;
      const next: SessionFileCandidate = {
        filePath: abs,
        source: "claude",
        projectName: guessClaudeProjectName(d.name),
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
      if (input.limit) pushNewestBounded(candidates, next, input.limit);
      else candidates.push(next);
    }
    if (absoluteProjectDir) break;
  }
  return candidates.sort((a, b) => b.modifiedMs - a.modifiedMs);
}

function candidateToDiscovered(candidate: SessionFileCandidate): DiscoveredSessionFile {
  return {
    path: candidate.filePath,
    source: candidate.source,
    status: candidate.status,
    project: candidate.projectName,
    modifiedMs: candidate.modifiedMs,
    sizeBytes: candidate.sizeBytes,
  };
}

/**
 * CLI source runtime: resolves local Claude/Codex resources and exposes them
 * through service ports without leaking filesystem discovery policy into the
 * service package.
 */
export function createSessionSourceRuntime(): SessionSourceRuntime {
  return {
    listCodexSources: collectCodexSources,
    discoverCodexSessionFiles: discoverCodexFilesForSource,
    codexDiscoveryMaxAgeMs: ({ status }) => codexDiscoveryMaxAgeMs(status),

    async discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]> {
      const out: DiscoveredSessionFile[] = [];
      if (input.source === "claude" || input.source === "all") {
        const candidates = await discoverClaudeCandidates({ project: input.project, limit: input.limit });
        out.push(...candidates.map(candidateToDiscovered));
      }
      if (input.source === "codex" || input.source === "all") {
        const candidates = await discoverCodexCandidates(input.limit);
        out.push(...candidates.map(candidateToDiscovered));
      }
      out.sort((a, b) => b.modifiedMs - a.modifiedMs);
      return input.limit && input.limit > 0 ? out.slice(0, input.limit) : out;
    },

    async statFile(input: { path: string }) {
      const resolved = path.resolve(expandHomePath(input.path));
      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat) return null;
      return {
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
    },

    readJsonlObjects(input: { path: string }) {
      return readJsonlObjects(path.resolve(expandHomePath(input.path)));
    },
  };
}
