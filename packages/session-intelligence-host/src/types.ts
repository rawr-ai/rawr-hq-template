import type { AnalyticsClient, Logger } from "@rawr/hq-sdk";

export type SessionSource = "claude" | "codex";
export type SessionSourceFilter = SessionSource | "all";
export type SessionStatus = "live" | "archived";
export type RoleFilter = "user" | "assistant" | "tool" | "all";
export type SessionMessageRole = "user" | "assistant" | "tool";

export type SessionMessage = {
  role: SessionMessageRole;
  content: string;
  timestamp?: string;
};

export type ClaudeSessionMetadata = {
  sessionId?: string;
  summaries?: string[];
  firstUserMessage?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  lastTimestamp?: string;
  model?: string;
  modelProvider?: string;
  error?: string;
};

export type CodexSessionMetadata = {
  sessionId?: string;
  firstUserMessage?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  lastTimestamp?: string;
  model?: string;
  modelProvider?: string;
  modelContextWindow?: number;
  sessionMetaCount?: number;
  cwdFirst?: string;
  gitBranchFirst?: string;
  timestampFirst?: string;
  compactionCount?: number;
  compactionAutoWatcherCount?: number;
  compactionLastTimestamp?: string;
  error?: string;
};

export type SessionMetadata = ClaudeSessionMetadata | CodexSessionMetadata;

export type SessionListItem = {
  path: string;
  sessionId?: string;
  source: SessionSource;
  status?: SessionStatus;
  title?: string;
  project?: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
  modelProvider?: string;
  modelContextWindow?: number;
  modified: string;
  started?: string;
  sizeKb: number;
};

export type SessionFilters = {
  project?: string;
  cwdContains?: string;
  branch?: string;
  model?: string;
  since?: string;
  until?: string;
};

export type ExtractOptions = {
  roles: RoleFilter[];
  includeTools: boolean;
  dedupe: boolean;
  offset: number;
  maxMessages: number;
};

export type ExtractedSession = {
  source: SessionSource;
  sessionId?: string;
  file: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
  modelProvider?: string;
  modelContextWindow?: number;
  sessionMetaCount?: number;
  cwdFirst?: string;
  gitBranchFirst?: string;
  started?: string;
  messageCount: number;
  messages: SessionMessage[];
};

export type ResolveResult = {
  resolved: {
    path: string;
    source: SessionSource;
    status?: SessionStatus;
    modified: string;
    sizeBytes: number;
  };
  metadata: SessionMetadata;
};

export type MetadataSearchHit = SessionListItem & {
  matchScore: number;
};

export type SearchHit = SessionListItem & {
  matchCount: number;
  matchSnippet: string;
};

export type ReindexResult = {
  indexed: number;
  total: number;
};

export type CodexSessionFile = {
  filePath: string;
  status: SessionStatus;
  modifiedMs: number;
  sizeBytes: number;
};

export type SessionFileCandidate = {
  filePath: string;
  status?: SessionStatus;
  projectName?: string;
  modifiedMs: number;
  sizeBytes: number;
};

export type SessionFileStat = {
  modifiedMs: number;
  sizeBytes: number;
};

export type SessionSourceRuntime = {
  discoverSessions(input: {
    source: SessionSourceFilter;
    limit?: number;
    project?: string;
  }): Promise<Array<{
    path: string;
    source: SessionSource;
    status?: SessionStatus;
    project?: string;
    modifiedMs: number;
    sizeBytes: number;
  }>>;
  resolveExistingPath(input: string): Promise<string | null>;
  statFile(input: string | { path: string }): Promise<SessionFileStat>;
  readJsonlObjects(input: string | { path: string }): AsyncIterable<unknown>;
  readFirstJsonlObject(input: string | { path: string }): Promise<unknown | null>;
  listClaudeSessionCandidates(input: { project?: string; limit?: number }): Promise<SessionFileCandidate[]>;
  listCodexSessionCandidates(input: { limit?: number }): Promise<SessionFileCandidate[]>;
  findClaudeSessionPathById(sessionId: string): Promise<string | null>;
  findCodexSessionCandidateByNeedle(needle: string): Promise<SessionFileCandidate | null>;
  detectSessionFormat(input: { filePath: string }): Promise<SessionSource | "unknown">;
  listSessions(input: { source: SessionSourceFilter; limit?: number; filters?: SessionFilters }): Promise<SessionListItem[]>;
  resolveSession(input: { session: string; source?: SessionSourceFilter }): Promise<ResolveResult | { error: string }>;
  extractSession(input: { filePath: string; options: ExtractOptions }): Promise<ExtractedSession | { error: string }>;
  listCodexSessionFiles(input?: { limit?: number }): Promise<CodexSessionFile[]>;
};

export type SessionSearchTextInput = {
  filePath: string;
  source?: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
};

export type SessionIndexRuntime = {
  getSearchText(input: {
    indexPath: string;
    path: string;
    rolesKey: string;
    includeTools: boolean;
  }): Promise<{
    indexPath: string;
    path: string;
    rolesKey: string;
    includeTools: boolean;
    modifiedMs: number;
    sizeBytes: number;
    content: string;
  } | null>;
  setSearchText(input: {
    indexPath: string;
    path: string;
    rolesKey: string;
    includeTools: boolean;
    modifiedMs: number;
    sizeBytes: number;
    content: string;
  }): Promise<void>;
  clearSearchText(input?: { indexPath?: string; path?: string }): Promise<void>;
  getSearchTextCached(input: SessionSearchTextInput, loader?: () => Promise<string>): Promise<string>;
  clearIndexFile(indexPath: string): Promise<void>;
  defaultIndexPath(): string;
  reindexSessions(input: {
    sessions: Array<{ path: string; source?: SessionSource }>;
    roles: RoleFilter[];
    includeTools: boolean;
    indexPath: string;
    limit?: number;
  }): Promise<ReindexResult>;
  clearIndex(input?: { indexPath?: string }): Promise<void>;
  searchSessionsByMetadata(input: { sessions: SessionListItem[]; needle: string; limit?: number }): MetadataSearchHit[];
  searchSessionsByContent(input: {
    sessions: SessionListItem[];
    pattern: string;
    ignoreCase?: boolean;
    maxMatches?: number;
    snippetLen?: number;
    roles: RoleFilter[];
    includeTools: boolean;
    useIndex?: boolean;
    indexPath: string;
  }): Promise<SearchHit[]>;
};

export type SessionIntelligenceBoundary = {
  deps: {
    logger: Logger;
    analytics: AnalyticsClient;
    sessionSourceRuntime: SessionSourceRuntime;
    sessionIndexRuntime: SessionIndexRuntime;
  };
  scope: {};
  config: {};
};
