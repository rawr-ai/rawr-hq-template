import type { SourceContent, SourcePlugin, SyncRunResult } from "../schemas";

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

export interface ExecutionRuntime {
  runSync(input: SyncExecutionInput): Promise<SyncRunResult>;
}
