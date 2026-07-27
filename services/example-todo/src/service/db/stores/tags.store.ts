import type { Sql } from "@rawr/hq-sdk";
import type { TodoIdentifierType } from "../../model/dto/identifier";
import type { Tag } from "../../model/dto/tag";
import type { WorkspaceIdType } from "../../model/dto/workspace-id";
import type { TagsStore } from "../../model/ports/tags-store";

/**
 * Binds tag persistence to the SQL capability and workspace selected by the
 * service so tag routes consume one scoped store instead of raw database access.
 */
export function createTagsStore(sql: Sql, workspaceId: WorkspaceIdType): TagsStore {
  return {
    async findById(id: TodoIdentifierType): Promise<Tag | null> {
      return await sql.queryOne<Tag>("SELECT * FROM tags WHERE id = $1 AND workspace_id = $2", [
        id,
        workspaceId,
      ]);
    },

    async findByIds(ids: TodoIdentifierType[]): Promise<Tag[]> {
      return await sql.query<Tag>(
        "SELECT * FROM tags WHERE id = ANY($1) AND workspace_id = $2 ORDER BY name ASC",
        [ids, workspaceId]
      );
    },

    async findAll(): Promise<Tag[]> {
      return await sql.query<Tag>("SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC", [
        workspaceId,
      ]);
    },

    async existsByName(name: string): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>(
        "SELECT id FROM tags WHERE name = $1 AND workspace_id = $2",
        [name, workspaceId]
      );
      return !!row;
    },

    async insert(tag: Tag): Promise<Tag> {
      const row = await sql.queryOne<Tag>(
        `INSERT INTO tags (id, workspace_id, name, color, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tag.id, tag.workspaceId, tag.name, tag.color, tag.createdAt]
      );

      if (!row) {
        throw new Error("tags.insert returned no row");
      }

      return row;
    },
  };
}
