import type { MetadataSearchHit, RoleFilter, SearchHit, SessionListItem, SessionSource } from "../types";
import { detectSessionFormat } from "../detect";
import { extractClaudeMessages } from "../claude/parse";
import { extractCodexMessages } from "../codex/parse";
import { getSearchTextCached } from "./index";

function metadataMatchScore(session: SessionListItem, needle: string): number {
  const n = needle.toLowerCase();
  const fields: Array<keyof SessionListItem | "status"> = [
    "title",
    "cwd",
    "project",
    "gitBranch",
    "model",
    "path",
    "sessionId",
    "status",
    "modelProvider",
  ];
  let score = 0;
  for (const f of fields) {
    const raw = (session as any)[f];
    if (raw == null) continue;
    const s = String(raw).toLowerCase();
    if (!s) continue;
    if (s.includes(n)) {
      score += 1;
      if (f === "title" || f === "cwd" || f === "path" || f === "sessionId") score += 1;
    }
  }
  return score;
}

export function searchSessionsByMetadata(sessions: SessionListItem[], needle: string, limit: number): MetadataSearchHit[] {
  const trimmed = needle.trim();
  if (!trimmed) return [];
  const ranked: MetadataSearchHit[] = [];
  for (const s of sessions) {
    const score = metadataMatchScore(s, trimmed);
    if (score <= 0) continue;
    ranked.push({ ...s, matchScore: score });
  }
  ranked.sort((a, b) => (a.matchScore === b.matchScore ? (a.modified < b.modified ? 1 : -1) : b.matchScore - a.matchScore));
  return limit > 0 ? ranked.slice(0, limit) : ranked;
}

export async function searchSessionsByContent(input: {
  sessions: SessionListItem[];
  pattern: string;
  ignoreCase: boolean;
  maxMatches: number;
  snippetLen: number;
  roles: RoleFilter[];
  includeTools: boolean;
  useIndex: boolean;
  indexPath: string;
}): Promise<SearchHit[]> {
  const flags = input.ignoreCase ? "gmi" : "gm";
  let rx: RegExp;
  try {
    rx = new RegExp(input.pattern, flags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid regex for --query: ${msg}`);
  }

  const hits: SearchHit[] = [];
  for (const s of input.sessions) {
    const filePath = s.path;
    const source = (await detectSessionFormat(filePath)) as SessionSource;
    const text = input.useIndex
      ? await getSearchTextCached({ filePath, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath })
      : await (source === "claude"
          ? extractClaudeMessages(filePath, input.roles, input.includeTools).then((msgs) =>
              msgs
                .map((m) => `${m.role === "user" ? "U" : m.role === "assistant" ? "A" : "T"}: ${m.content}`)
                .join("\n\n"),
            )
          : extractCodexMessages(filePath, input.roles, input.includeTools).then((msgs) =>
              msgs
                .map((m) => `${m.role === "user" ? "U" : m.role === "assistant" ? "A" : "T"}: ${m.content}`)
                .join("\n\n"),
            ));

    const matches = [...text.matchAll(rx)];
    if (!matches.length) continue;

    const first = matches[0]!;
    const start = Math.max(0, first.index! - Math.floor(input.snippetLen / 2));
    const end = Math.min(text.length, start + input.snippetLen);
    const snippet = text.slice(start, end).replaceAll("\n", "\\n");

    hits.push({ ...s, matchCount: matches.length, matchSnippet: snippet });
  }

  hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
  return hits.slice(0, input.maxMatches);
}
