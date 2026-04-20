import type { RoleFilter, SessionMessage } from "../../../shared/entities";

/**
 * Builds the searchable text representation for a session transcript.
 *
 * @remarks
 * Search treats the transcript as an ordered stream of role-tagged messages.
 * This helper is deliberately mechanical: it does not decide *which* sessions
 * are searched or how results are ranked, only how messages are rendered into
 * a text blob for regex matching.
 */
export function buildSearchText(messages: Array<Pick<SessionMessage, "role" | "content">>): string {
  return messages.map((message) => `${message.role === "user" ? "U" : message.role === "assistant" ? "A" : "T"}: ${message.content}`).join("\n\n");
}

/**
 * Stable cache key segment for role filters.
 *
 * @remarks
 * The search-cache repository stores text by `{path, rolesKey, includeTools}` so
 * a role filter change cannot accidentally reuse a cached value.
 */
export function rolesKey(roles: RoleFilter[]): string {
  return [...new Set(roles)].sort().join(",");
}
