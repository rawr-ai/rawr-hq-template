import type { RoleFilter, SessionMessage } from "../../../shared/entities";

export function buildSearchText(messages: Array<Pick<SessionMessage, "role" | "content">>): string {
  return messages.map((message) => `${message.role === "user" ? "U" : message.role === "assistant" ? "A" : "T"}: ${message.content}`).join("\n\n");
}

export function rolesKey(roles: RoleFilter[]): string {
  return [...new Set(roles)].sort().join(",");
}
