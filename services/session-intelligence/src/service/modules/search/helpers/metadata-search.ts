import type { SessionListItem } from "../../../shared/entities";
import type { MetadataSearchHit } from "../entities";

function metadataMatchScore(session: SessionListItem, needle: string): number {
  const normalizedNeedle = needle.toLowerCase();
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
  for (const field of fields) {
    const raw = session[field as keyof SessionListItem];
    if (raw != null && String(raw).toLowerCase().includes(normalizedNeedle)) {
      score +=
        field === "title" ||
        field === "cwd" ||
        field === "path" ||
        field === "sessionId"
          ? 2
          : 1;
    }
  }

  return score;
}

/**
 * Ranks sessions by how well their metadata matches a human-provided needle.
 *
 * @remarks
 * This is a first-pass "find the right session" affordance for projections. It
 * intentionally stays metadata-only: full transcript search is handled by the
 * `content` procedure.
 */
export function searchSessionsByMetadata(
  sessions: SessionListItem[],
  needle: string,
  limit: number,
): MetadataSearchHit[] {
  const trimmed = needle.trim();
  if (!trimmed) return [];

  const ranked = sessions
    .map((session) => ({ ...session, matchScore: metadataMatchScore(session, trimmed) }))
    .filter((session) => session.matchScore > 0);

  ranked.sort((a, b) =>
    a.matchScore === b.matchScore
      ? a.modified < b.modified
        ? 1
        : -1
      : b.matchScore - a.matchScore,
  );

  return limit > 0 ? ranked.slice(0, limit) : ranked;
}
