export type SourceType = "json_conversation" | "markdown_document";
export type FamilyClassification = "standalone" | "root" | "branch" | "duplicate";

export type JsonConversationMessage = {
  role: string;
  say: string;
};

export type SourceRecord = {
  sourceId: string;
  path: string;
  type: SourceType;
  hash: string;
  sizeBytes: number;
  title: string;
  summary: string;
  created?: string;
  updated?: string;
  exported?: string;
  link?: string;
  messages?: JsonConversationMessage[];
  messagesHash?: string;
  normalizedTitle?: string;
  branchDepth: number;
  lineCount?: number;
  headings?: string[];
};

export type FamilyEdge = {
  fromSourceId: string;
  toSourceId: string;
  type: "branches_from" | "duplicate_of";
  confidence: number;
  sharedPrefixLen: number;
  evidence: string[];
};

export type FamilyGraph = {
  family_id: string;
  canonical_title: string;
  summary: string;
  member_source_ids: string[];
  member_filenames: string[];
  root_source_id: string;
  classification: Record<string, FamilyClassification>;
  edges: Array<{
    from_source_id: string;
    to_source_id: string;
    type: FamilyEdge["type"];
    confidence: number;
    shared_prefix_len: number;
    evidence: string[];
  }>;
};

export type Relationship = {
  from_id: string;
  to_id: string;
  type: FamilyEdge["type"];
  confidence: number;
  evidence: string[];
  notes: string;
};

export type Anomaly = {
  anomaly_id: string;
  type: string;
  source_ids: string[];
  severity: "high" | "medium" | "low";
  notes: string;
};

export type NormalizedThread = Record<string, unknown>;

export type ConversationExport = {
  metadata?: {
    title?: string;
    link?: string;
    dates?: {
      created?: string;
      updated?: string;
      exported?: string;
    };
  };
  messages?: unknown;
};

export type CorpusWorkspacePaths = {
  workspaceRoot: string;
  sourceJsonDir: string;
  workDir: string;
  sourceDocsDir: string;
  generatedDir: string;
  corpusDir: string;
  reportsDir: string;
  normalizedDir: string;
  readmePath: string;
  gitignorePath: string;
};

export type InitWorkspaceResult = {
  workspaceRoot: string;
  createdPaths: string[];
  existingPaths: string[];
  files: {
    readmePath: string;
    gitignorePath: string;
  };
};

export type ConsolidateWorkspaceResult = {
  workspaceRoot: string;
  sourceCounts: {
    jsonConversations: number;
    markdownDocuments: number;
    totalSources: number;
  };
  familyCount: number;
  normalizedThreadCount: number;
  anomalyCount: number;
  warnings: string[];
  outputPaths: {
    inventory: string;
    familyGraphs: string;
    intermediateGraph: string;
    manifest: string;
    reportsDir: string;
    normalizedThreadsDir: string;
    validationReport: string;
  };
};
