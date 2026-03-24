import { describe, expect, it } from "vitest";

import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderFeedbackAdapter,
  type EmbeddedPlaceholderFeedbackSessionEntry,
} from "@rawr/hq-sdk/host-adapters/feedback/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  createEmbeddedInMemoryDbPoolAdapter,
  createEmbeddedInMemorySqlAdapter,
} from "@rawr/hq-sdk/host-adapters/sql/embedded-in-memory";

describe("host adapters", () => {
  it("records placeholder logger output into the provided sink", () => {
    const sink: EmbeddedPlaceholderLogEntry[] = [];
    const logger = createEmbeddedPlaceholderLoggerAdapter({ sink });

    logger.info("todo.tags.create", { tagId: "tag-1" });
    logger.error("todo.tags.create", { reason: "bad" });

    expect(sink).toEqual([
      { level: "info", event: "todo.tags.create", payload: { tagId: "tag-1" } },
      { level: "error", event: "todo.tags.create", payload: { reason: "bad" } },
    ]);
  });

  it("records placeholder analytics output into the provided sink", () => {
    const sink: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const analytics = createEmbeddedPlaceholderAnalyticsAdapter({ sink });

    analytics.track("orpc.procedure", { path: "tags.list" });

    expect(sink).toEqual([
      { event: "orpc.procedure", payload: { path: "tags.list" } },
    ]);
  });

  it("creates deterministic placeholder feedback sessions", async () => {
    const sink: EmbeddedPlaceholderFeedbackSessionEntry[] = [];
    const feedback = createEmbeddedPlaceholderFeedbackAdapter({ sink });

    await expect(feedback.createSession({ path: "tags.list", traceId: "trace-1" })).resolves.toEqual({
      sessionId: "embedded-feedback-session-1",
    });
    expect(sink).toEqual([
      { path: "tags.list", traceId: "trace-1", sessionId: "embedded-feedback-session-1" },
    ]);
  });

  it("keeps the in-memory SQL adapter and db pool aligned", async () => {
    const sql = createEmbeddedInMemorySqlAdapter();
    await sql.queryOne(
      "INSERT INTO tags",
      ["tag-1", "workspace-default", "backend", "#00aa00", "2026-02-25T00:00:01.000Z"],
    );

    await expect(sql.query(
      "SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC",
      ["workspace-default"],
    )).resolves.toEqual([
      {
        id: "tag-1",
        workspaceId: "workspace-default",
        name: "backend",
        color: "#00aa00",
        createdAt: "2026-02-25T00:00:01.000Z",
      },
    ]);

    const dbPool = createEmbeddedInMemoryDbPoolAdapter();
    const pooledSql = await dbPool.connect();
    await expect(pooledSql.query(
      "SELECT * FROM tags WHERE workspace_id = $1 ORDER BY name ASC",
      ["workspace-default"],
    )).resolves.toEqual([]);
  });
});
