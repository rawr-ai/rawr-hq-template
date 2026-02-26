/**
 * @fileoverview Tag repository (query logic + domain failure typing).
 *
 * @remarks
 * This repository demonstrates a module-specific domain error
 * (`DuplicateTagError`) alongside shared service errors.
 *
 * Constraints:
 * - Never throw ORPC errors from here.
 * - Keep "expected" conflicts (like duplicate names) as typed domain failures.
 * - Convert adapter exceptions to `DatabaseError`.
 *
 * @agents
 * When adding writes, decide whether the failure mode is shared (`DatabaseError`)
 * or module-specific (new tag error class in `tags/errors.ts`).
 */
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import type { Sql } from "../../boundary/deps";
import { DatabaseError, NotFoundError } from "../../boundary/service-errors";
import { DuplicateTagError } from "./errors";
import type { Tag } from "./schemas";

function toDatabaseError(cause: unknown): DatabaseError {
  return new DatabaseError(cause);
}

export function createTagRepository(sql: Sql) {
  return {
    findById(id: string): ResultAsync<Tag, NotFoundError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<Tag>("SELECT * FROM tags WHERE id = $1", [id]),
        toDatabaseError,
      ).andThen((row) => (row ? ok(row) : err(new NotFoundError("Tag", id))));
    },

    findByIds(ids: string[]): ResultAsync<Tag[], DatabaseError> {
      return ResultAsync.fromPromise(
        sql.query<Tag>("SELECT * FROM tags WHERE id = ANY($1) ORDER BY name ASC", [ids]),
        toDatabaseError,
      );
    },

    findAll(): ResultAsync<Tag[], DatabaseError> {
      return ResultAsync.fromPromise(sql.query<Tag>("SELECT * FROM tags ORDER BY name ASC"), toDatabaseError);
    },

    insert(tag: Tag): ResultAsync<Tag, DuplicateTagError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<{ id: string }>("SELECT id FROM tags WHERE name = $1", [tag.name]),
        toDatabaseError,
      ).andThen((existing) => {
        if (existing) {
          return errAsync(new DuplicateTagError(tag.name));
        }

        return ResultAsync.fromPromise(
          sql.queryOne<Tag>(
            `INSERT INTO tags (id, name, color, created_at)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [tag.id, tag.name, tag.color, tag.createdAt],
          ),
          toDatabaseError,
        ).andThen((row) => (row ? okAsync(row) : errAsync(new DatabaseError("tags.insert returned no row"))));
      });
    },
  };
}

export type TagRepository = ReturnType<typeof createTagRepository>;
