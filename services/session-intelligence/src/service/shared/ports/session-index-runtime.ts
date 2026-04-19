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

/**
 * Generic SQL boundary for service-owned indexes.
 *
 * Session-intelligence modules own table shape, SQL, freshness rules, and prune
 * behavior. The embedding plugin owns only concrete resource instantiation:
 * where the index lives, how SQLite is opened, and how files are deleted.
 */
export interface SessionIndexRuntime {
  defaultIndexPath(): string;
  execute(input: SessionIndexStatement & { indexPath: string }): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(input: SessionIndexStatement & { indexPath: string }): Promise<Row[]>;
  transaction(input: SessionIndexBatch): Promise<void>;
  removeIndex(input: { indexPath: string }): Promise<void>;
}
