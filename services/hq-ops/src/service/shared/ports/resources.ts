export type FileStat = {
  isFile: boolean;
  mtimeMs: number;
};

export type ExclusiveFileHandle = {
  writeText(contents: string): Promise<void>;
  close(): Promise<void>;
};

export type FileSystemResource = {
  stat(filePath: string): Promise<FileStat | null>;
  readText(filePath: string): Promise<string | null>;
  writeText(filePath: string, contents: string): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  rename(fromPath: string, toPath: string): Promise<void>;
  rm(filePath: string): Promise<void>;
  openExclusive(filePath: string): Promise<ExclusiveFileHandle>;
};

export type PathResource = {
  join(...parts: string[]): string;
  dirname(filePath: string): string;
  resolve(filePath: string): string;
  realpath(filePath: string): Promise<string | null>;
  toFileHref(filePath: string): string;
  homeDir(): string;
};

export type ExecResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
  durationMs: number;
};

export type ProcessResource = {
  pid(): number;
  isAlive(pid: number): boolean;
  sleep(ms: number): Promise<void>;
  exec(
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs?: number },
  ): Promise<ExecResult>;
};

export type SqliteStatement = {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

export type SqliteDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatement;
  close(): void;
};

export type SqliteResource = {
  open(dbPath: string): Promise<SqliteDatabase>;
};

export type SemanticEmbeddingConfig = {
  provider: "openai" | "voyage";
  model: string;
};

export type EmbeddingResource = {
  getConfig(): SemanticEmbeddingConfig | null;
  embedText(input: { text: string; config: SemanticEmbeddingConfig }): Promise<Float32Array>;
};

export type HqOpsResources = {
  fs: FileSystemResource;
  path: PathResource;
  process: ProcessResource;
  sqlite: SqliteResource;
  embeddings: EmbeddingResource;
};
