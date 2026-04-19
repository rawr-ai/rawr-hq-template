/**
 * @fileoverview Public DTO aliases for the session-intelligence service package.
 */
export type {
  RoleFilter,
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  SessionListItem,
  SessionMessage,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "./service/shared/schemas";
export type {
  ResolveResult,
} from "./service/modules/catalog/schemas";
export type {
  ExtractedSession,
} from "./service/modules/transcripts/schemas";
export type {
  MetadataSearchHit,
  ReindexResult,
  SearchHit,
} from "./service/modules/search/schemas";

export type ErrorResult = {
  error: string;
};
