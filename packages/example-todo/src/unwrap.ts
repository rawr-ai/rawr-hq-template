import type { Result } from "neverthrow";
import type { DatabaseError, NotFoundError } from "./errors";

export async function unwrapDatabaseResult<T>(
  result: PromiseLike<Result<T, DatabaseError>>,
  handlers: {
    onDatabaseError: (error: DatabaseError) => never;
  },
): Promise<T> {
  const resolved = await result;
  if (resolved.isOk()) {
    return resolved.value;
  }

  return handlers.onDatabaseError(resolved.error);
}

export async function unwrapSharedResult<T>(
  result: PromiseLike<Result<T, NotFoundError | DatabaseError>>,
  handlers: {
    onNotFoundError: (error: NotFoundError) => never;
    onDatabaseError: (error: DatabaseError) => never;
  },
): Promise<T> {
  const resolved = await result;
  if (resolved.isOk()) {
    return resolved.value;
  }

  if (resolved.error._tag === "NotFoundError") {
    return handlers.onNotFoundError(resolved.error);
  }

  return handlers.onDatabaseError(resolved.error);
}
