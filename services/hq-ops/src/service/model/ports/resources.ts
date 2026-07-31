/** File metadata needed by HQ operations without exposing a host filesystem API. */
export type FileStat = {
  isFile: boolean;
  mtimeMs: number;
};

/** Directory-entry projection used by repository scans. */
export type FileSystemDirEntry = {
  name: string;
  isDirectory: boolean;
};

/** Exclusive write lease whose lifecycle remains owned by the filesystem provider. */
export type ExclusiveFileHandle = {
  writeText(contents: string): Promise<void>;
  close(): Promise<void>;
};

/** Host-neutral filesystem capabilities admitted through the service context. */
export type FileSystemResource = {
  stat(filePath: string): Promise<FileStat | null>;
  readDir(dirPath: string): Promise<FileSystemDirEntry[] | null>;
  readText(filePath: string): Promise<string | null>;
  writeText(filePath: string, contents: string): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  rename(fromPath: string, toPath: string): Promise<void>;
  rm(filePath: string): Promise<void>;
  openExclusive(filePath: string): Promise<ExclusiveFileHandle>;
};

/** Host-neutral path capabilities used to derive repository-owned locations. */
export type PathResource = {
  join(...parts: string[]): string;
  dirname(filePath: string): string;
  resolve(filePath: string): string;
  realpath(filePath: string): Promise<string | null>;
  toFileHref(filePath: string): string;
  homeDir(): string;
};

/** Observable result of one host process invocation. */
export type ExecResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
  durationMs: number;
};

/** Host process capabilities consumed by security operations. */
export type ProcessResource = {
  pid(): number;
  isAlive(pid: number): boolean;
  sleep(ms: number): Promise<void>;
  exec(
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number }
  ): Promise<ExecResult>;
};

/** Minimal statement surface used by the journal store implementation. */
export type SqliteStatement = {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

/** Request-scoped database handle supplied by the selected SQLite provider. */
export type SqliteDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatement;
  close(): void;
};

/** Host capability that opens one migration-ready Journal index database. */
export type JournalIndexDatabaseResource = {
  open(dbPath: string): Promise<SqliteDatabase>;
};

/** Selected embedding provider and model used by semantic journal search. */
export type SemanticEmbeddingConfig = {
  provider: "openai" | "voyage";
  model: string;
};

/** Host embedding capabilities admitted for optional semantic search. */
export type EmbeddingResource = {
  getConfig(): SemanticEmbeddingConfig | null;
  embedText(input: { text: string; config: SemanticEmbeddingConfig }): Promise<Float32Array>;
};

/** Complete host capability set admitted once at the HQ Ops service boundary. */
export type HqOpsResources = {
  fs: FileSystemResource;
  path: PathResource;
  process: ProcessResource;
  journalIndexDatabase: JournalIndexDatabaseResource;
  embeddings: EmbeddingResource;
};
