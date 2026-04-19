import type { SourceContent, SourcePlugin } from "../../shared/schemas";

export type SyncExecutionInput = {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  codexHomes: string[];
  claudeHomes: string[];
  includeCodex: boolean;
  includeClaude: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  force: boolean;
  gc: boolean;
  dryRun: boolean;
};
