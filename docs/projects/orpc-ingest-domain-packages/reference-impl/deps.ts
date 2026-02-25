// ============================================================================
// Shared dependencies for the entire todo service.
// Every module in this package receives these.
// ============================================================================

export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface Clock {
  now(): Date
}

export interface TodoDeps {
  sql: Sql
  logger: Logger
  clock: Clock
}
