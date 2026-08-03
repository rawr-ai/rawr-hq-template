import type { CodexSessionFile, CodexSessionSource } from "../dto";

/** Persisted observations used to decide whether one Codex root needs refresh. */
export type IndexedCodexRootState = {
  root_mtime_ms?: unknown;
  scanned_at_ms?: unknown;
};

/** Service-owned persistence contract for the Codex discovery index. */
export interface CodexDiscoveryStore {
  /** Ensures the discovery index is ready for reads and writes. */
  initialize(): Promise<void>;
  /** Replaces every indexed file for one source root and records its scan facts. */
  replaceRoot(input: {
    source: CodexSessionSource;
    rootMtimeMs: number;
    scannedAtMs: number;
    rows: CodexSessionFile[];
  }): Promise<void>;
  /** Removes all index state for one source root. */
  deleteRoot(rootDir: string): Promise<void>;
  /** Reads the latest scan observations for one source root. */
  readRootState(rootDir: string): Promise<IndexedCodexRootState | null>;
  /** Reads newest indexed files across the selected source roots. */
  queryRows(sources: CodexSessionSource[], max: number): Promise<CodexSessionFile[]>;
  /** Removes one stale file observation. */
  deleteFile(filePath: string): Promise<void>;
  /** Refreshes mutable observations for one indexed file. */
  updateFile(row: CodexSessionFile): Promise<void>;
}
