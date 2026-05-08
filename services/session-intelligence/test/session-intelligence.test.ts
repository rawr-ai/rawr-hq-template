import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import {
  createClientOptions,
  createFixtureSourceRuntime,
  createInvocation,
  MemorySessionIndexRuntime,
  MemorySessionSourceRuntime,
} from "./helpers";
import {
  CLAUDE_FIXTURE_PATH,
  CODEX_STRUCTURED_FIXTURE,
  CODEX_STRUCTURED_FIXTURE_PATH,
  CODEX_FIXTURE_PATH,
} from "./fixture-data";

const NEWER_NO_FACET_PATH = "/fixtures/.codex/sessions/2026/02/07/newer-no-facet.jsonl";

const NEWER_NO_FACET_FIXTURE = `{"type":"session_meta","timestamp":"2026-02-07T00:00:00.000Z","payload":{"id":"newer-no-facet","cwd":"/tmp/rawr-fixture-codex","timestamp":"2026-02-07T00:00:00.000Z","git":{"branch":"codex/no-facet"},"model":"gpt-5.2","model_provider":"openai"}}
{"type":"event_msg","timestamp":"2026-02-07T00:00:01.000Z","payload":{"type":"user_message","message":"newer session without structured markers"}}
`;

function createStructuredSourceRuntime(): MemorySessionSourceRuntime {
  const runtime = createFixtureSourceRuntime();
  runtime.add({
    path: CODEX_STRUCTURED_FIXTURE_PATH,
    contents: CODEX_STRUCTURED_FIXTURE,
    source: "codex",
    status: "live",
    project: "rawr-fixture-codex",
    modifiedMs: Date.parse("2026-02-06T00:00:02.000Z"),
  });
  return runtime;
}

function createBoundedFacetRuntime(): MemorySessionSourceRuntime {
  const runtime = new MemorySessionSourceRuntime();
  runtime.add({
    path: NEWER_NO_FACET_PATH,
    contents: NEWER_NO_FACET_FIXTURE,
    source: "codex",
    status: "live",
    project: "rawr-fixture-codex",
    modifiedMs: Date.parse("2026-02-07T00:00:02.000Z"),
  });
  runtime.add({
    path: CODEX_STRUCTURED_FIXTURE_PATH,
    contents: CODEX_STRUCTURED_FIXTURE,
    source: "codex",
    status: "live",
    project: "rawr-fixture-codex",
    modifiedMs: Date.parse("2026-02-06T00:00:02.000Z"),
  });
  return runtime;
}

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

  it("extracts custom Codex tool payloads when tools are included", async () => {
    const sourceRuntime = createStructuredSourceRuntime();
    const client = createClient(createClientOptions({ sourceRuntime }));

    const extracted = await client.transcripts.extract(
      {
        path: CODEX_STRUCTURED_FIXTURE_PATH,
        options: {
          roles: ["all"],
          includeTools: true,
          dedupe: false,
          offset: 0,
          maxMessages: 0,
        },
      },
      createInvocation("trace-extract-custom-tools"),
    );

    const content = extracted.messages.map((message) => message.content).join("\n");
    expect(content).toContain('"type": "function_call"');
    expect(content).toContain('"type": "custom_tool_call"');
    expect(content).toContain('"name": "apply_patch"');
    expect(content).toContain('"input": "*** Begin Patch');
    expect(content).toContain('"type": "custom_tool_call_output"');
    expect(content).toContain('"output": "{\\"output\\":\\"ok\\"}"');
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

  it("extracts structured facets through service-owned facet search", async () => {
    const sourceRuntime = createStructuredSourceRuntime();
    const client = createClient(createClientOptions({ sourceRuntime }));

    const result = await client.search.facets(
      {
        source: "codex",
        filters: {},
        facetFilters: {
          tags: ["proposed_plan"],
          directives: ["code-comment"],
          tools: ["apply_patch"],
          payloadTypes: ["custom_tool_call"],
          topTypes: ["response_item"],
        },
        limit: 5,
        candidateLimit: 5,
        includeFacets: true,
      },
      createInvocation("trace-search-facets"),
    );

    expect(result.hits.map((hit) => hit.path)).toEqual([CODEX_STRUCTURED_FIXTURE_PATH]);
    const facets = result.hits[0]?.facets;
    expect(facets?.xmlBlockTags).toContain("proposed_plan");
    expect(facets?.xmlBlockTags).not.toContain("environment_context");
    expect(facets?.xmlBlockTags).not.toContain("permissions_instructions");
    expect(facets?.directives).toContain("code-comment");
    expect(facets?.directives).toContain("automation-update");
    expect(facets?.directives).not.toContain("hidden-directive");
    expect(facets?.toolCalls).toEqual(["apply_patch", "exec_command"]);
    expect(facets?.payloadTypes).toEqual(expect.arrayContaining(["custom_tool_call", "custom_tool_call_output", "message"]));
    expect(facets?.topLevelTypes).toEqual(expect.arrayContaining(["event_msg", "response_item", "session_meta"]));
  });

  it("keeps metadata result limit separate from facet candidate scanning", async () => {
    const sourceRuntime = createBoundedFacetRuntime();
    const client = createClient(createClientOptions({ sourceRuntime }));

    const broadScan = await client.search.metadata(
      {
        source: "codex",
        filters: {},
        needle: "session-facets",
        limit: 1,
        facetFilters: { tags: ["proposed_plan"] },
        candidateLimit: 2,
        includeFacets: true,
      },
      createInvocation("trace-metadata-facet-broad"),
    );
    expect(broadScan.hits.map((hit) => hit.path)).toEqual([CODEX_STRUCTURED_FIXTURE_PATH]);
    expect(broadScan.hits[0]?.facets?.xmlBlockTags).toContain("proposed_plan");

    const narrowScan = await client.search.metadata(
      {
        source: "codex",
        filters: {},
        needle: "session-facets",
        limit: 1,
        facetFilters: { tags: ["proposed_plan"] },
        candidateLimit: 1,
        includeFacets: true,
      },
      createInvocation("trace-metadata-facet-narrow"),
    );
    expect(narrowScan.hits).toEqual([]);
  });

  it("supports bounded facet-only search with service-owned candidate defaults and validation", async () => {
    const sourceRuntime = createBoundedFacetRuntime();
    const client = createClient(createClientOptions({ sourceRuntime }));

    const defaulted = await client.search.facets(
      {
        source: "codex",
        filters: {},
        facetFilters: { tags: ["proposed_plan"] },
        limit: 1,
        includeFacets: false,
      },
      createInvocation("trace-facet-default"),
    );
    expect(defaulted.hits.map((hit) => hit.path)).toEqual([CODEX_STRUCTURED_FIXTURE_PATH]);

    const bounded = await client.search.facets(
      {
        source: "codex",
        filters: {},
        facetFilters: { tags: ["proposed_plan"] },
        limit: 1,
        candidateLimit: 1,
        includeFacets: false,
      },
      createInvocation("trace-facet-bounded"),
    );
    expect(bounded.hits).toEqual([]);

    for (const candidateLimit of [0, -1, 1.5, 50_001]) {
      const result = await safe(client.search.facets(
        {
          source: "codex",
          filters: {},
          facetFilters: { tags: ["proposed_plan"] },
          limit: 1,
          candidateLimit,
          includeFacets: false,
        },
        createInvocation(`trace-facet-invalid-${candidateLimit}`),
      ));
      expect(result.isSuccess).toBe(false);
    }
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

  it("uses candidateLimit for faceted content scans while maxMatches caps returned hits", async () => {
    const sourceRuntime = createBoundedFacetRuntime();
    const indexRuntime = new MemorySessionIndexRuntime();
    const client = createClient(createClientOptions({ sourceRuntime, indexRuntime }));

    const uncached = await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 1,
        pattern: "structured parity content needle",
        ignoreCase: true,
        maxMatches: 1,
        snippetLen: 120,
        roles: ["all"],
        includeTools: false,
        useIndex: false,
        facetFilters: { tags: ["proposed_plan"] },
        candidateLimit: 2,
        includeFacets: true,
      },
      createInvocation("trace-content-facet-uncached"),
    );

    expect(uncached.hits.map((hit) => hit.path)).toEqual([CODEX_STRUCTURED_FIXTURE_PATH]);
    expect(uncached.hits[0]?.facets?.xmlBlockTags).toContain("proposed_plan");
    expect(indexRuntime.setCalls).toBe(0);

    const cached = await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 1,
        pattern: "structured parity content needle",
        ignoreCase: true,
        maxMatches: 1,
        snippetLen: 120,
        roles: ["all"],
        includeTools: false,
        useIndex: true,
        facetFilters: { tags: ["proposed_plan"] },
        candidateLimit: 2,
        includeFacets: true,
      },
      createInvocation("trace-content-facet-cached"),
    );

    expect(cached.hits.map((hit) => hit.path)).toEqual([CODEX_STRUCTURED_FIXTURE_PATH]);
    expect(indexRuntime.getCalls).toBe(1);
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
