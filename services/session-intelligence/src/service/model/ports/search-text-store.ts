/** Stable identity of one normalized search-text cache entry. */
export type SearchTextCacheKey = {
  path: string;
  rolesKey: string;
  includeTools: boolean;
};

/** Cached normalized search text plus the source observations that validate it. */
export type SearchTextCacheEntry = SearchTextCacheKey & {
  modifiedMs: number;
  sizeBytes: number;
  content: string;
};

/** Service-owned persistence contract for normalized transcript search text. */
export interface SearchTextStore {
  /** Reads cached text for one session and role projection. */
  read(input: SearchTextCacheKey): Promise<SearchTextCacheEntry | null>;
  /** Persists normalized text and the source observations that produced it. */
  write(input: SearchTextCacheEntry): Promise<void>;
  /** Clears every cached projection for one session path. */
  clear(path: string): Promise<void>;
  /** Removes the complete service-owned index. */
  clearAll(): Promise<void>;
}
