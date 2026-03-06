import { ResultAsync, ok, err } from 'neverthrow'
import type { Tag } from './schemas.js'
import type { Sql } from '../base.js'
import { NotFoundError, DatabaseError } from '../errors.js'
import { DuplicateTagError } from './errors.js'

export function createTagRepository(sql: Sql) {
  return {
    findById(id: string): ResultAsync<Tag, NotFoundError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<Tag>('SELECT * FROM tags WHERE id = $1', [id]),
        (cause) => new DatabaseError(cause),
      ).andThen((row) =>
        row ? ok(row) : err(new NotFoundError('Tag', id)),
      )
    },

    findAll(): ResultAsync<Tag[], DatabaseError> {
      return ResultAsync.fromPromise(
        sql.query<Tag>('SELECT * FROM tags ORDER BY name ASC'),
        (cause) => new DatabaseError(cause),
      )
    },

    insert(tag: Tag): ResultAsync<Tag, DuplicateTagError | DatabaseError> {
      return ResultAsync.fromPromise(
        sql.queryOne<Tag>(
          'SELECT id FROM tags WHERE name = $1',
          [tag.name],
        ),
        (cause) => new DatabaseError(cause),
      ).andThen((existing) =>
        existing
          ? err(new DuplicateTagError(tag.name))
          : ResultAsync.fromPromise(
              sql.queryOne<Tag>(
                `INSERT INTO tags (id, name, color, created_at)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [tag.id, tag.name, tag.color, tag.createdAt],
              ),
              (cause) => new DatabaseError(cause),
            ).map((row) => row!),
      )
    },
  }
}

export type TagRepository = ReturnType<typeof createTagRepository>
