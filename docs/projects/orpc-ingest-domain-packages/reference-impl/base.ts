import { os } from '@orpc/server'

export interface Sql {
  query<T>(text: string, params?: unknown[]): Promise<T[]>
  queryOne<T>(text: string, params?: unknown[]): Promise<T | null>
}

export interface DbPool {
  connect(): Sql | Promise<Sql>
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface Clock {
  now(): Date
}

export interface TodoDeps {
  dbPool: DbPool
  logger: Logger
  clock: Clock
}

export interface BaseContext {
  deps: TodoDeps
}

interface SqlProviderContext {
  deps: {
    dbPool: DbPool
  }
}

interface SqlExecutionContext {
  sql: Sql
}

export const base = os.context<BaseContext>()

export const sqlProvider = os.context<SqlProviderContext>().use(async ({ context, next }) => {
  const sql = await context.deps.dbPool.connect()
  return next({
    context: {
      sql,
    },
  })
})
