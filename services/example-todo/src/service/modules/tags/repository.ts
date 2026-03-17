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
import type { Sql } from "../../../orpc-sdk";
import { UnexpectedInternalError } from "../../shared/internal-errors";
import type { Tag } from "./schemas";

export function createRepository(sql: Sql, workspaceId: string) {
  return {
    async findById(id: string): Promise<Tag | null> {
      return await sql.queryOne<Tag>("SELECT * FROM tags WHERE id = $1 AND workspace_id = $2", [id, workspaceId]);
    },

    async findByIds(ids: string[]): Promise<Tag[]> {
      return await sql.query<Tag>(
        "SELECT * FROM tags WHERE id = ANY($1) AND workspace_id = $2 ORDER BY name ASC",
        [ids, workspaceId],
      );
    },

    async findAll(): Promise<Tag[]> {
      return await sql.query<Tag>("SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC", [workspaceId]);
    },

    async existsByName(name: string): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>(
        "SELECT id FROM tags WHERE name = $1 AND workspace_id = $2",
        [name, workspaceId],
      );
      return !!row;
    },

    async insert(tag: Tag): Promise<Tag> {
      const row = await sql.queryOne<Tag>(
        `INSERT INTO tags (id, workspace_id, name, color, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tag.id, tag.workspaceId, tag.name, tag.color, tag.createdAt],
      );

      if (!row) {
        throw new UnexpectedInternalError("tags.insert returned no row");
      }

      return row;
    },
  };
}
