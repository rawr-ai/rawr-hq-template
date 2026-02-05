export type SessionSource = "claude" | "codex";
export type SessionSourceFilter = SessionSource | "all";

export type OutputFormat = "json" | "text" | "markdown";
export type RoleFilter = "user" | "assistant" | "tool" | "all";

export type SessionStatus = "live" | "archived";

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

export type SessionFilters = {
  project?: string;
  cwdContains?: string;
  branch?: string;
  model?: string;
  since?: string;
  until?: string;
};

export type SearchHit = SessionListItem & {
  matchCount: number;
  matchSnippet: string;
};

export type MetadataSearchHit = SessionListItem & {
  matchScore: number;
};
