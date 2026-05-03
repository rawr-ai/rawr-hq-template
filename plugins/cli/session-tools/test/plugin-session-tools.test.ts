import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionsExtract from "../src/commands/sessions/extract";
import SessionsList from "../src/commands/sessions/list";
import SessionsResolve from "../src/commands/sessions/resolve";
import SessionsSearch from "../src/commands/sessions/search";
import {
  createSessionIntelligenceClient,
  setSessionIntelligenceClientFactoryForTest,
  type SessionIntelligenceClient,
} from "../src/lib/session-intelligence-client";
import type { ExtractedSession, ResolveResult, SessionListItem } from "../src/lib/session-types";

const tempPaths: string[] = [];
const envKeys = ["HOME", "CODEX_HOME", "RAWR_SESSION_INDEX_PATH", "RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS"] as const;
let envSnapshot: Record<string, string | undefined>;

const session: SessionListItem = {
  path: "/tmp/codex-session.jsonl",
  sessionId: "abcdef1234567890",
  source: "codex",
  status: "live",
  title: "rawr fixture command surface",
  project: "rawr-hq-template",
  cwd: "/work/rawr-hq-template",
  gitBranch: "codex/session-intelligence-plan",
  model: "gpt-5",
  modelProvider: "openai",
  modified: "2026-04-18T12:00:00.000Z",
  started: "2026-04-18T11:58:00.000Z",
  sizeKb: 12,
};

const resolved: ResolveResult = {
  resolved: {
    path: session.path,
    source: "codex",
    status: "live",
    modified: session.modified,
    sizeBytes: 12_288,
  },
  metadata: {
    sessionId: session.sessionId,
    firstUserMessage: session.title,
    cwd: session.cwd,
    gitBranch: session.gitBranch,
    timestamp: session.started,
    model: session.model,
    modelProvider: session.modelProvider,
  },
};

const extracted: ExtractedSession = {
  source: "codex",
  sessionId: session.sessionId,
  file: session.path,
  cwd: session.cwd,
  gitBranch: session.gitBranch,
  model: session.model,
  modelProvider: session.modelProvider,
  started: session.started,
  messageCount: 2,
  messages: [
    { role: "user", content: "Find the rawr fixture." },
    { role: "assistant", content: "The oclif command saw it." },
  ],
};

beforeEach(() => {
  envSnapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
});

afterEach(async () => {
  vi.restoreAllMocks();
  setSessionIntelligenceClientFactoryForTest(null);
  for (const key of envKeys) {
    const value = envSnapshot[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) await fs.rm(tempPath, { recursive: true, force: true });
  }
});

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(dir);
  return dir;
}

async function writeCodexSession(input: {
  codexHome: string;
  name: string;
  id: string;
  modified: string;
  message: string;
}): Promise<string> {
  const sessionsDir = path.join(input.codexHome, "sessions", "2026", "02", "05");
  await fs.mkdir(sessionsDir, { recursive: true });
  const filePath = path.join(sessionsDir, input.name);
  const rows = [
    {
      type: "session_meta",
      timestamp: input.modified,
      payload: {
        id: input.id,
        cwd: "/tmp/rawr-fixture-codex",
        timestamp: input.modified,
        git: { branch: "codex/session-intelligence-resource-test" },
        model: "gpt-5",
        model_provider: "openai",
        info: { model_context_window: 128000 },
      },
    },
    {
      type: "event_msg",
      timestamp: input.modified,
      payload: {
        type: "user_message",
        message: input.message,
      },
    },
  ];
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const date = new Date(input.modified);
  await fs.utimes(filePath, date, date);
  return filePath;
}

function createFakeClient(overrides: Partial<SessionIntelligenceClient> = {}): SessionIntelligenceClient {
  const client = {
    catalog: {
      list: vi.fn(async () => ({ sessions: [session] })),
      resolve: vi.fn(async () => resolved),
    },
    transcripts: {
      detect: vi.fn(async () => ({ source: "codex" })),
      extract: vi.fn(async () => extracted),
    },
    search: {
      metadata: vi.fn(async () => ({ hits: [{ ...session, matchScore: 3 }] })),
      content: vi.fn(async () => ({ hits: [{ ...session, matchCount: 1, matchSnippet: "A: The oclif command saw it." }] })),
      clearIndex: vi.fn(async () => ({ cleared: true })),
      reindex: vi.fn(async () => ({ indexed: 1, total: 1 })),
    },
  };

  return ({
    ...client,
    ...overrides,
    catalog: { ...client.catalog, ...overrides.catalog },
    transcripts: { ...client.transcripts, ...overrides.transcripts },
    search: { ...client.search, ...overrides.search },
  } as unknown) as SessionIntelligenceClient;
}

function installFakeClient(client = createFakeClient()): SessionIntelligenceClient {
  setSessionIntelligenceClientFactoryForTest(async () => client);
  return client;
}

function spyOutput(command: { prototype: unknown }) {
  return vi.spyOn(command.prototype as any, "outputResult" as any).mockImplementation(() => {});
}

function firstOutputData<T>(spy: ReturnType<typeof spyOutput>): T {
  const [result] = spy.mock.calls[0] as unknown as [{ ok: true; data: T }];
  expect(result.ok).toBe(true);
  return result.data;
}

function firstOutputError(spy: ReturnType<typeof spyOutput>): { code?: string; message: string } {
  const [result] = spy.mock.calls[0] as unknown as [{ ok: false; error: { code?: string; message: string } }];
  expect(result.ok).toBe(false);
  return result.error;
}

describe("@rawr/plugin-session-tools", () => {
  it("lists sessions through the session-intelligence client", async () => {
    const client = installFakeClient();
    const outputSpy = spyOutput(SessionsList);

    await SessionsList.run(["--source", "codex", "--limit", "1", "--cwd-contains", "rawr", "--json"]);

    expect(client.catalog.list).toHaveBeenCalledWith(
      {
        source: "codex",
        limit: 1,
        filters: {
          project: undefined,
          cwdContains: "rawr",
          branch: undefined,
          model: undefined,
          since: undefined,
          until: undefined,
        },
      },
      expect.objectContaining({ context: { invocation: { traceId: "plugin-session-tools.catalog.list" } } }),
    );
    const data = firstOutputData<{ sessions: SessionListItem[]; outDir: string | null }>(outputSpy);
    expect(data.sessions).toEqual([session]);
    expect(data.outDir).toBeNull();
  });

  it("resolves a session and preserves the structured output shape", async () => {
    installFakeClient();
    const outputSpy = spyOutput(SessionsResolve);

    await SessionsResolve.run(["abcdef", "--source", "codex", "--json"]);

    const data = firstOutputData<{ resolved: ResolveResult; outDir: string | null }>(outputSpy);
    expect(data.resolved).toEqual(resolved);
    expect(data.outDir).toBeNull();
  });

  it("keeps resolve failures on SESSION_NOT_FOUND", async () => {
    installFakeClient(
      createFakeClient({
        catalog: {
          resolve: vi.fn(async () => ({ error: "Session not found: missing" })),
        } as unknown as SessionIntelligenceClient["catalog"],
      }),
    );
    const outputSpy = spyOutput(SessionsResolve);

    await expect(SessionsResolve.run(["missing", "--json"])).rejects.toMatchObject({ oclif: { exit: 2 } });

    expect(firstOutputError(outputSpy).code).toBe("SESSION_NOT_FOUND");
  });

  it("searches metadata through the session-intelligence search module", async () => {
    const client = installFakeClient();
    const outputSpy = spyOutput(SessionsSearch);

    await SessionsSearch.run(["--query-metadata", "rawr-fixture", "--source", "all", "--limit", "5", "--json"]);

    expect(client.catalog.list).not.toHaveBeenCalled();
    expect(client.search.metadata).toHaveBeenCalledWith(
      {
        source: "all",
        filters: {
          project: undefined,
          cwdContains: undefined,
          branch: undefined,
          model: undefined,
          since: undefined,
          until: undefined,
        },
        needle: "rawr-fixture",
        limit: 5,
      },
      expect.objectContaining({ context: { invocation: { traceId: "plugin-session-tools.search.metadata" } } }),
    );
    const data = firstOutputData<{ query: string; hits: Array<SessionListItem & { matchScore: number }>; outDir: string | null }>(
      outputSpy,
    );
    expect(data.query).toBe("rawr-fixture");
    expect(data.hits).toHaveLength(1);
    expect(data.hits[0]?.matchScore).toBe(3);
  });

  it("preserves ambiguous search query validation before client work", async () => {
    const client = installFakeClient();
    const outputSpy = spyOutput(SessionsSearch);

    await expect(SessionsSearch.run(["--query-metadata", "rawr", "--query", "oclif", "--json"])).rejects.toMatchObject({
      oclif: { exit: 2 },
    });

    expect(client.catalog.list).not.toHaveBeenCalled();
    expect(client.search.metadata).not.toHaveBeenCalled();
    expect(firstOutputError(outputSpy).code).toBe("AMBIGUOUS_QUERY");
  });

  it("extracts split chunk outputs with plugin-local transcript formatting", async () => {
    installFakeClient();
    const outDir = await makeTempDir("rawr-plugin-session-extract-");
    const outputSpy = spyOutput(SessionsExtract);

    await SessionsExtract.run([
      "abcdef",
      "--source",
      "codex",
      "--format",
      "markdown",
      "--chunk-size",
      "1",
      "--chunk-output",
      "split",
      "--out-dir",
      outDir,
      "--json",
    ]);

    const metadata = JSON.parse(await fs.readFile(path.join(outDir, "metadata.json"), "utf8")) as unknown;
    const chunkOne = await fs.readFile(path.join(outDir, "transcript.chunk-001.md"), "utf8");
    const chunkTwo = await fs.readFile(path.join(outDir, "transcript.chunk-002.md"), "utf8");
    const data = firstOutputData<{ outFiles: string[]; outputs: Array<{ name: string }> }>(outputSpy);

    expect(metadata).toMatchObject({ resolved, extracted: { sessionId: session.sessionId, messageCount: 2 } });
    expect(chunkOne).toContain("## Chunk 1/2");
    expect(chunkOne).toContain("## User");
    expect(chunkTwo).toContain("## Chunk 2/2");
    expect(chunkTwo).toContain("## Assistant");
    expect(data.outputs.map((o) => o.name)).toEqual(["transcript.chunk-001.md", "transcript.chunk-002.md"]);
    expect(data.outFiles).toHaveLength(2);
  });

  it("keeps split chunk validation on MISSING_OUT_DIR", async () => {
    const client = installFakeClient();
    const outputSpy = spyOutput(SessionsExtract);

    await expect(SessionsExtract.run(["abcdef", "--chunk-size", "1", "--chunk-output", "split", "--json"])).rejects.toMatchObject({
      oclif: { exit: 2 },
    });

    expect(client.catalog.resolve).not.toHaveBeenCalled();
    expect(firstOutputError(outputSpy).code).toBe("MISSING_OUT_DIR");
  });

  it("binds plugin-local resources to the session-intelligence service", async () => {
    const tmp = await makeTempDir("rawr-plugin-session-real-resources-");
    const home = path.join(tmp, "home");
    const codexHome = path.join(tmp, "codex");
    const indexPath = path.join(tmp, "session-index.sqlite");
    await fs.mkdir(home, { recursive: true });
    process.env.HOME = home;
    process.env.CODEX_HOME = codexHome;
    process.env.RAWR_SESSION_INDEX_PATH = indexPath;
    process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "600000";

    const filePath = await writeCodexSession({
      codexHome,
      name: "session-resource-test.jsonl",
      id: "resource-test",
      modified: "2026-02-05T00:00:00.000Z",
      message: "findable plugin resource needle",
    });

    const client = await createSessionIntelligenceClient();
    const listedResponse = await client.catalog.list({ source: "codex", limit: 1, filters: {} }, {
      context: { invocation: { traceId: "test.session.catalog.list" } },
    });
    const listed = listedResponse.sessions;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      path: filePath,
      source: "codex",
      sessionId: "resource-test",
      project: "rawr-fixture-codex",
    });
    await expect(fs.stat(indexPath)).resolves.toMatchObject({ size: expect.any(Number) });

    const resolved = await client.catalog.resolve({ session: "resource-test", source: "codex" }, {
      context: { invocation: { traceId: "test.session.catalog.resolve" } },
    });
    expect("error" in resolved).toBe(false);
    if ("error" in resolved) throw new Error(String(resolved.error));
    expect(resolved.resolved.path).toBe(filePath);

    const reindex = await client.search.reindex(
      {
        source: "codex",
        filters: {},
        roles: ["all"],
        includeTools: false,
        limit: 0,
      },
      {
        context: { invocation: { traceId: "test.session.search.reindex" } },
      },
    );
    expect(reindex).toEqual({ indexed: 1, total: 1 });

    const contentResponse = await client.search.content(
      {
        source: "codex",
        filters: {},
        limit: 5,
        pattern: "resource needle",
        ignoreCase: true,
        maxMatches: 5,
        snippetLen: 120,
        roles: ["all"],
        includeTools: false,
        useIndex: true,
      },
      {
        context: { invocation: { traceId: "test.session.search.content" } },
      },
    );
    const hits = contentResponse.hits;
    expect(hits).toHaveLength(1);
    expect(hits[0]?.matchSnippet).toContain("resource needle");
    await expect(fs.stat(indexPath)).resolves.toMatchObject({ size: expect.any(Number) });

    const extracted = await client.transcripts.extract(
      {
        path: filePath,
        options: {
          roles: ["all"],
          includeTools: false,
          dedupe: true,
          offset: 0,
          maxMessages: 0,
        },
      },
      {
        context: { invocation: { traceId: "test.session.transcripts.extract" } },
      },
    );
    expect("error" in extracted).toBe(false);
    if ("error" in extracted) throw new Error(String(extracted.error));
    expect(extracted.messages[0]?.content).toBe("findable plugin resource needle");
  });
});
