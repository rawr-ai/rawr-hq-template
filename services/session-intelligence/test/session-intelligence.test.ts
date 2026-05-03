import { describe, expect, it } from "vitest";
import { createClient } from "../src";
import {
  createClientOptions,
  createFixtureSourceRuntime,
  createInvocation,
  MemorySessionIndexRuntime,
} from "./helpers";
import {
  CLAUDE_FIXTURE_PATH,
  CODEX_FIXTURE_PATH,
} from "./fixture-data";

describe("@rawr/session-intelligence", () => {
  it("keeps the package-root client entrypoint stable", async () => {
    const client = createClient(createClientOptions());
    const result = await client.transcripts.detect(
      { path: CLAUDE_FIXTURE_PATH },
      createInvocation("trace-root"),
    );

    expect(result.source).toBe("claude");
  });

  it("detects Claude and Codex JSONL formats through the source runtime", async () => {
    const client = createClient(createClientOptions());

    await expect(client.transcripts.detect({ path: CLAUDE_FIXTURE_PATH }, createInvocation("trace-detect-claude"))).resolves.toEqual({
      source: "claude",
    });
    await expect(client.transcripts.detect({ path: CODEX_FIXTURE_PATH }, createInvocation("trace-detect-codex"))).resolves.toEqual({
      source: "codex",
    });
  });

  it("lists sessions with normalized metadata and newest-first ordering", async () => {
    const client = createClient(createClientOptions());

    const result = await client.catalog.list(
      {
        source: "all",
        limit: 10,
        filters: {},
      },
      createInvocation("trace-list"),
    );

    expect(result.sessions.map((session) => session.source)).toEqual(["codex", "claude"]);
    expect(result.sessions[0]).toMatchObject({
      path: CODEX_FIXTURE_PATH,
      sessionId: "019c21af-23f2-7401-af13-9582c5881d39",
      project: "rawr-fixture-codex",
      gitBranch: "codex/feat-sessions-plugin",
      modelProvider: "openai",
    });
    expect(result.sessions[1]).toMatchObject({
      path: CLAUDE_FIXTURE_PATH,
      sessionId: "fixture-claude-001",
      project: "fixture-claude-project",
      gitBranch: "main",
      modelProvider: "anthropic",
    });
  });

  it("resolves sessions by path and by source-specific id semantics", async () => {
    const client = createClient(createClientOptions());

    const byPath = await client.catalog.resolve(
      {
        session: CLAUDE_FIXTURE_PATH,
        source: "all",
      },
      createInvocation("trace-resolve-path"),
    );
    expect(byPath.resolved.source).toBe("claude");
    expect(byPath.metadata).toMatchObject({
      cwd: "/tmp/rawr-fixture-claude",
      gitBranch: "main",
    });

    const byCodexPartial = await client.catalog.resolve(
      {
        session: "019c21af-23f2",
        source: "codex",
      },
      createInvocation("trace-resolve-codex"),
    );
    expect(byCodexPartial.resolved).toMatchObject({
      path: CODEX_FIXTURE_PATH,
      source: "codex",
      status: "live",
    });
  });

  it("extracts normalized transcript messages with slicing and dedupe", async () => {
    const client = createClient(createClientOptions());

    const extracted = await client.transcripts.extract(
      {
        path: CODEX_FIXTURE_PATH,
        options: {
          roles: ["all"],
          includeTools: false,
          dedupe: true,
          offset: 0,
          maxMessages: 0,
        },
      },
      createInvocation("trace-extract"),
    );

    expect(extracted.source).toBe("codex");
    expect(extracted.modelProvider).toBe("openai");
    expect(extracted.messageCount).toBe(2);
    expect(extracted.messages[0]).toMatchObject({
      role: "user",
      content: "Find sessions mentioning oclif.",
    });
  });

  it("searches session metadata without touching content", async () => {
    const client = createClient(createClientOptions());

    const result = await client.search.metadata(
      {
        source: "all",
        filters: {},
        needle: "feat-sessions-plugin",
        limit: 10,
      },
      createInvocation("trace-search-metadata"),
    );

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.path).toBe(CODEX_FIXTURE_PATH);
    expect(result.hits[0]?.matchScore).toBeGreaterThan(0);
  });

  it("searches session content with and without the host-provided cache", async () => {
    const sourceRuntime = createFixtureSourceRuntime();
    const indexRuntime = new MemorySessionIndexRuntime();
    const client = createClient(createClientOptions({ sourceRuntime, indexRuntime }));

    const uncached = await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 10,
        pattern: "oclif",
        ignoreCase: true,
        maxMatches: 10,
        snippetLen: 80,
        roles: ["all"],
        includeTools: false,
        useIndex: false,
      },
      createInvocation("trace-content-uncached"),
    );

    expect(uncached.hits).toHaveLength(1);
    expect(indexRuntime.setCalls).toBe(0);

    const cached = await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 10,
        pattern: "oclif",
        ignoreCase: true,
        maxMatches: 10,
        snippetLen: 80,
        roles: ["all"],
        includeTools: false,
        useIndex: true,
      },
      createInvocation("trace-content-cached"),
    );

    expect(cached.hits).toHaveLength(1);
    expect(indexRuntime.getCalls).toBe(1);
    expect(indexRuntime.setCalls).toBe(1);

    await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 10,
        pattern: "oclif",
        ignoreCase: true,
        maxMatches: 10,
        snippetLen: 80,
        roles: ["all"],
        includeTools: false,
        useIndex: true,
      },
      createInvocation("trace-content-cache-hit"),
    );

    expect(indexRuntime.getCalls).toBe(2);
    expect(indexRuntime.setCalls).toBe(1);
  });

  it("reindexes and clears cached search text through the index port", async () => {
    const sourceRuntime = createFixtureSourceRuntime();
    const indexRuntime = new MemorySessionIndexRuntime();
    const client = createClient(createClientOptions({ sourceRuntime, indexRuntime }));

    const result = await client.search.reindex(
      {
        source: "codex",
        filters: {},
        roles: ["all"],
        includeTools: false,
        limit: 0,
      },
      createInvocation("trace-reindex"),
    );

    expect(result).toEqual({ indexed: 1, total: 1 });
    expect(indexRuntime.entries.size).toBe(1);

    await client.search.clearIndex(
      { path: CODEX_FIXTURE_PATH },
      createInvocation("trace-clear"),
    );
    expect(indexRuntime.entries.size).toBe(0);
  });
});
