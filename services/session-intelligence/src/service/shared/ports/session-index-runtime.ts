export type SessionSearchCacheKey = {
  path: string;
  rolesKey: string;
  includeTools: boolean;
};

export type SessionSearchCacheEntry = SessionSearchCacheKey & {
  modifiedMs: number;
  sizeBytes: number;
  content: string;
};

export interface SessionIndexRuntime {
  getSearchText(input: SessionSearchCacheKey): Promise<SessionSearchCacheEntry | null>;
  setSearchText(input: SessionSearchCacheEntry): Promise<void>;
  clearSearchText(input?: { path?: string }): Promise<void>;
}
