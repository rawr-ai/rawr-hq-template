/**
 * @fileoverview Tag repository (data access only).
 *
 * @remarks
 * Expected duplicate/missing states are represented as values:
 * - `existsByName` returns a boolean.
 * - `findById` returns `null` when missing.
 *
 * Unexpected/internal failures bubble via thrown adapter exceptions.
 *
 * @agents
 * Keep procedure boundary concerns out of this file.
 */
import { UnexpectedInternalError, type Sql } from "../../orpc-runtime";
import type { Tag } from "./schemas";

export function createRepository(sql: Sql) {
  return {
    async findById(id: string): Promise<Tag | null> {
      return await sql.queryOne<Tag>("SELECT * FROM tags WHERE id = $1", [id]);
    },

    async findByIds(ids: string[]): Promise<Tag[]> {
      return await sql.query<Tag>("SELECT * FROM tags WHERE id = ANY($1) ORDER BY name ASC", [ids]);
    },

    async findAll(): Promise<Tag[]> {
      return await sql.query<Tag>("SELECT * FROM tags ORDER BY name ASC");
    },

    async existsByName(name: string): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>("SELECT id FROM tags WHERE name = $1", [name]);
      return !!row;
    },

    async insert(tag: Tag): Promise<Tag> {
      const row = await sql.queryOne<Tag>(
        `INSERT INTO tags (id, name, color, created_at)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [tag.id, tag.name, tag.color, tag.createdAt],
      );

      if (!row) {
        throw new UnexpectedInternalError("tags.insert returned no row");
      }

      return row;
    },
  };
}
