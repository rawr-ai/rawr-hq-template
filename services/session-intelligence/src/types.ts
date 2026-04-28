/**
 * @fileoverview Public DTO aliases for the session-intelligence service package.
 */
import type { Client } from "./client";

export type {
  RoleFilter,
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionMessage,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "./service/shared/entities";

export type SessionListItem = Awaited<ReturnType<Client["catalog"]["list"]>>["sessions"][number];
export type ResolveResult = Awaited<ReturnType<Client["catalog"]["resolve"]>>;
export type ExtractedSession = Awaited<ReturnType<Client["transcripts"]["extract"]>>;
export type MetadataSearchHit = Awaited<ReturnType<Client["search"]["metadata"]>>["hits"][number];
export type SearchHit = Awaited<ReturnType<Client["search"]["content"]>>["hits"][number];
export type ReindexResult = Awaited<ReturnType<Client["search"]["reindex"]>>;

export type ErrorResult = {
  error: string;
};
