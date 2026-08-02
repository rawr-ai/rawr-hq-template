import type { Sql } from "@habitat-ai/rawr-hq-sdk";
import type { TodoIdentifierType } from "../../model/dto/identifier";
import type { TagType } from "../../model/dto/tag";
import type { WorkspaceIdType } from "../../model/dto/workspace-id";
import type { TagsStore } from "../../model/ports/tags-store";

/**
 * Binds tag persistence to the SQL capability and workspace selected by the
 * service so tag routes consume one scoped store instead of raw database access.
 */
export function createTagsStore(sql: Sql, workspaceId: WorkspaceIdType): TagsStore {
  return {
    async findById(id: TodoIdentifierType): Promise<TagType | null> {
      return await sql.queryOne<TagType>("SELECT * FROM tags WHERE id = $1 AND workspace_id = $2", [
        id,
        workspaceId,
      ]);
    },

    async findByIds(ids: TodoIdentifierType[]): Promise<TagType[]> {
      return await sql.query<TagType>(
        "SELECT * FROM tags WHERE id = ANY($1) AND workspace_id = $2 ORDER BY name ASC",
        [ids, workspaceId]
      );
    },

    async findAll(): Promise<TagType[]> {
      return await sql.query<TagType>(
        "SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC",
        [workspaceId]
      );
    },

    async existsByName(name: string): Promise<boolean> {
      const row = await sql.queryOne<{ id: string }>(
        "SELECT id FROM tags WHERE name = $1 AND workspace_id = $2",
        [name, workspaceId]
      );
      return !!row;
    },

    async insert(tag: TagType): Promise<TagType> {
      const row = await sql.queryOne<TagType>(
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
