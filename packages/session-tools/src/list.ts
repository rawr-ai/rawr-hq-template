import path from "node:path";
import fs from "node:fs/promises";
import { getClaudeProjectsDir, listCodexSessionFiles, pathExists } from "./paths";
import { getClaudeSessionMetadata } from "./claude/parse";
import { getCodexSessionMetadata, inferProjectFromCwd } from "./codex/parse";
import type { SessionFilters, SessionListItem, SessionSourceFilter } from "./types";

function parseDatetimeBestEffort(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^\\d{4}-\\d{2}-\\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
  const dt = new Date(normalized);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function sessionWithinWindow(modifiedIso: string, since?: string, until?: string): boolean {
  if (!since && !until) return true;
  const dt = parseDatetimeBestEffort(modifiedIso);
  if (!dt) return false;
  const sinceDt = since ? parseDatetimeBestEffort(since) : null;
  const untilDt = until ? parseDatetimeBestEffort(until) : null;
  if (sinceDt && dt < sinceDt) return false;
  if (untilDt && dt > untilDt) return false;
  return true;
}

function containsFilter(value: string | undefined, needle: string | undefined): boolean {
  if (!needle) return true;
  if (!value) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\\\") || input.startsWith("~");
}

function modelMatches(model: string | undefined, filter: string | undefined): boolean {
  if (!filter) return true;
  if (!model) return false;
  return model.toLowerCase().includes(filter.toLowerCase());
}

function guessClaudeProjectName(dirName: string): string {
  if (dirName.startsWith("-Users-")) {
    const parts = dirName.split("-");
    if (parts.length > 3) return parts.at(-1) || parts.at(-2) || dirName;
  }
  return dirName;
}

function hasMetadataFilters(filters: SessionFilters): boolean {
  return Boolean(filters.project || filters.cwdContains || filters.branch || filters.model || filters.since || filters.until);
}

type NewestFileCandidate = {
  filePath: string;
  projectName: string;
  modifiedMs: number;
  sizeBytes: number;
};

function pushNewestBounded(files: NewestFileCandidate[], next: NewestFileCandidate, max: number): void {
  if (files.length < max) {
    files.push(next);
    if (files.length === max) files.sort((a, b) => a.modifiedMs - b.modifiedMs);
    return;
  }
  if (!files.length || next.modifiedMs <= files[0]!.modifiedMs) return;
  files[0] = next;
  files.sort((a, b) => a.modifiedMs - b.modifiedMs);
}

export async function listSessions(input: {
  source: SessionSourceFilter;
  limit: number;
  filters?: SessionFilters;
}): Promise<SessionListItem[]> {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const sourceLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;

  const sessions: SessionListItem[] = [];

  if (input.source === "claude" || input.source === "all") {
    const claudeCandidates: NewestFileCandidate[] = [];
    const projectsDir = getClaudeProjectsDir();
    if (await pathExists(projectsDir)) {
      const projectFilter = filters.project ? String(filters.project).trim() : "";
      const absoluteProjectDir =
        projectFilter && looksLikePath(projectFilter) ? path.resolve(projectFilter.replace(/^~\//, `${process.env.HOME ?? ""}/`)) : null;
      const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        if (d.name.startsWith(".")) continue;
        const projectDir = absoluteProjectDir ?? path.join(projectsDir, d.name);
        if (!absoluteProjectDir && projectFilter) {
          const guessed = guessClaudeProjectName(d.name);
          if (!containsFilter(d.name, projectFilter) && !containsFilter(guessed, projectFilter)) continue;
        }
        if (absoluteProjectDir && projectDir !== absoluteProjectDir) continue;
        let files: string[] = [];
        try {
          files = (await fs.readdir(projectDir)).filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"));
        } catch {
          continue;
        }
        for (const f of files) {
          const abs = path.join(projectDir, f);
          let stat: Awaited<ReturnType<typeof fs.stat>>;
          try {
            stat = await fs.stat(abs);
          } catch {
            continue;
          }
          const next: NewestFileCandidate = {
            filePath: abs,
            projectName: guessClaudeProjectName(d.name),
            modifiedMs: stat.mtimeMs,
            sizeBytes: stat.size,
          };
          if (sourceLimit) pushNewestBounded(claudeCandidates, next, sourceLimit);
          else claudeCandidates.push(next);
        }
        if (absoluteProjectDir) break;
      }
      claudeCandidates.sort((a, b) => b.modifiedMs - a.modifiedMs);
      for (const candidate of claudeCandidates) {
        const modified = new Date(candidate.modifiedMs).toISOString();
        const meta = await getClaudeSessionMetadata(candidate.filePath);
        const title = meta.summaries && meta.summaries.length ? meta.summaries.at(-1) : meta.firstUserMessage;
        sessions.push({
          path: candidate.filePath,
          sessionId: meta.sessionId,
          source: "claude",
          title: title ?? undefined,
          project: candidate.projectName,
          cwd: meta.cwd,
          gitBranch: meta.gitBranch,
          model: meta.model,
          modelProvider: meta.modelProvider,
          modified,
          started: meta.timestamp,
          sizeKb: Math.floor(candidate.sizeBytes / 1024),
        });
      }
    }
  }

  if (input.source === "codex" || input.source === "all") {
    const files = await listCodexSessionFiles(sourceLimit || undefined);
    for (const f of files) {
      const modified = new Date(f.modifiedMs).toISOString();
      const meta = await getCodexSessionMetadata(f.filePath);
      sessions.push({
        path: f.filePath,
        sessionId: meta.sessionId,
        source: "codex",
        status: f.status,
        title: meta.firstUserMessage ?? undefined,
        project: inferProjectFromCwd(meta.cwd),
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modelContextWindow: meta.modelContextWindow,
        modified,
        started: meta.timestamp,
        sizeKb: Math.floor(f.sizeBytes / 1024),
      });
    }
  }

  sessions.sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0));

  const filtered = sessions.filter((s) => {
    if (filters.project) {
      const projectFilter = String(filters.project).trim();
      if (projectFilter) {
        if (looksLikePath(projectFilter)) {
          if (s.source !== "claude") return false;
        } else {
          if (!containsFilter(s.project, projectFilter)) return false;
        }
      }
    }
    if (!containsFilter(s.cwd, filters.cwdContains)) return false;
    if (!containsFilter(s.gitBranch, filters.branch)) return false;
    if (!modelMatches(s.model, filters.model)) return false;
    if (!sessionWithinWindow(s.modified, filters.since, filters.until)) return false;
    return true;
  });

  return limit ? filtered.slice(0, limit) : filtered;
}
