export type SessionSearchCacheKey = {
  indexPath: string;
  path: string;
  rolesKey: string;
  includeTools: boolean;
};

export type SessionSearchCacheEntry = SessionSearchCacheKey & {
  modifiedMs: number;
  sizeBytes: number;
  content: string;
};

export type SessionIndexStatement = {
  sql: string;
  params?: unknown[];
};

export type SessionIndexBatch = {
  indexPath: string;
  statements: SessionIndexStatement[];
};

export interface SessionIndexRuntime {
  defaultIndexPath(): string;
  execute(input: SessionIndexStatement & { indexPath: string }): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(input: SessionIndexStatement & { indexPath: string }): Promise<Row[]>;
  transaction(input: SessionIndexBatch): Promise<void>;
  removeIndex(input: { indexPath: string }): Promise<void>;
}
