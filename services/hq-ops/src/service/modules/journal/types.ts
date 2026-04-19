export type JournalEvent = {
  id: string;
  ts: string;
  cwd: string;
  argv: string[];
  commandId?: string;
  exitCode?: number;
  durationMs?: number;
  artifacts?: string[];
  steps?: Array<{ name: string; status: string; durationMs?: number; exitCode?: number }>;
};

export type JournalSnippetKind = "command" | "workflow" | "security" | "note";

export type JournalSnippet = {
  id: string;
  ts: string;
  kind: JournalSnippetKind;
  title: string;
  preview: string;
  body: string;
  tags: string[];
  sourceEventId?: string;
};

