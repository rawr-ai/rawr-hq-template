import type { DbPool, Sql } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { createClientOptions, createDeps, invocation } from "./helpers";

type RecordedCall = {
  params: unknown[] | undefined;
};

function recordingSql(sql: Sql, calls: RecordedCall[]): Sql {
  return {
    async query<T>(text: string, params?: unknown[]): Promise<T[]> {
      calls.push({ params });
      return await sql.query<T>(text, params);
    },
    async queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
      calls.push({ params });
      return await sql.queryOne<T>(text, params);
    },
  };
}

describe("example-todo database capability", () => {
  it("carries one client workspace through task, tag, and assignment persistence", async () => {
    const workspaceId = "workspace-recorded";
    const deps = createDeps();
    const sql = await deps.dbPool.connect();
    const calls: RecordedCall[] = [];
    const suppliedSql = recordingSql(sql, calls);
    let connectionCount = 0;
    const dbPool: DbPool = {
      connect() {
        connectionCount += 1;
        return suppliedSql;
      },
    };
    const client = createClient(
      createClientOptions({
        deps: { ...deps, dbPool },
        workspaceId,
      })
    );

    const task = await client.tasks.create(
      { title: "Record persistence" },
      invocation("trace-record-task")
    );
    const tag = await client.tags.create(
      { name: "recorded", color: "#123456" },
      invocation("trace-record-tag")
    );
    const assignment = await client.assignments.assign(
      { taskId: task.id, tagId: tag.id },
      invocation("trace-record-assignment")
    );
    const loaded = await client.assignments.listForTask(
      { taskId: task.id },
      invocation("trace-record-load")
    );

    expect(loaded).toEqual({ task, tags: [tag] });
    expect(connectionCount).toBe(4);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(({ params }) => params?.includes(workspaceId) === true)).toBe(true);
    for (const recordId of [task.id, tag.id, assignment.id]) {
      expect(
        calls.some(
          ({ params }) => params?.includes(workspaceId) === true && params.includes(recordId)
        )
      ).toBe(true);
    }
  });
});
