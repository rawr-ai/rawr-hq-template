import { describe, expect, it, vi } from "vitest";
import { createClient } from "../src/client";
import type { JournalStore } from "../src/service/shared/ports/journal-store";
import type { RepoStateStore } from "../src/service/shared/ports/repo-state-store";
import type { SecurityRuntime } from "../src/service/shared/ports/security-runtime";
import { createClientOptions, invocation } from "./helpers";

describe("hq-ops service runtime ports", () => {
  it("routes config procedures through the bound configStore", async () => {
    const client = createClient(
      createClientOptions({
        globalConfig: {
          version: 1,
          sync: {
            sources: {
              paths: ["/global/a"],
            },
          },
        },
        workspaceConfig: {
          version: 1,
          sync: {
            sources: {
              paths: ["/workspace/b"],
            },
          },
        },
      }),
    );

    const layered = await client.config.getLayeredConfig({}, invocation("trace-config"));
    expect(layered.global.path).toBe("/tmp/.rawr/config.json");
    expect(layered.workspace.path).toBe("/tmp/workspace/rawr.config.ts");
    expect(layered.merged?.sync?.sources?.paths).toEqual(["/global/a", "/workspace/b"]);

    const added = await client.config.addGlobalSyncSource({ path: "/global/c" }, invocation("trace-config-add"));
    expect(added.sources).toContain("/global/c");

    const removed = await client.config.removeGlobalSyncSource(
      { path: "/global/c" },
      invocation("trace-config-remove"),
    );
    expect(removed.sources).not.toContain("/global/c");
  });

  it("routes repo-state procedures through the bound repoStateStore", async () => {
    const repoStateStore: RepoStateStore = {
      getStateWithAuthority: vi.fn(async (repoRoot) => ({
        authorityRepoRoot: `${repoRoot}/authority`,
        state: {
          version: 1 as const,
          plugins: {
            enabled: ["@rawr/plugin-existing"],
            lastUpdatedAt: "2026-04-16T00:00:00.000Z",
          },
        },
      })),
      enablePlugin: vi.fn(async (_repoRoot, pluginId) => ({
        version: 1 as const,
        plugins: {
          enabled: [pluginId],
          lastUpdatedAt: "2026-04-16T00:00:01.000Z",
        },
      })),
      disablePlugin: vi.fn(async () => ({
        version: 1 as const,
        plugins: {
          enabled: [],
          lastUpdatedAt: "2026-04-16T00:00:02.000Z",
        },
      })),
    };

    const client = createClient(
      createClientOptions({
        deps: {
          repoStateStore,
        },
      }),
    );

    const state = await client.repoState.getState({}, invocation("trace-state"));
    expect(state.authorityRepoRoot).toBe("/tmp/workspace/authority");
    expect(repoStateStore.getStateWithAuthority).toHaveBeenCalledWith("/tmp/workspace");

    await client.repoState.enablePlugin({ pluginId: "@rawr/plugin-next" }, invocation("trace-enable"));
    expect(repoStateStore.enablePlugin).toHaveBeenCalledWith("/tmp/workspace", "@rawr/plugin-next");

    await client.repoState.disablePlugin({ pluginId: "@rawr/plugin-next" }, invocation("trace-disable"));
    expect(repoStateStore.disablePlugin).toHaveBeenCalledWith("/tmp/workspace", "@rawr/plugin-next");
  });

  it("routes journal procedures through the bound journalStore", async () => {
    const journalStore: JournalStore = {
      writeEvent: vi.fn(async (repoRoot, event) => ({ path: `${repoRoot}/events/${event.id}.json` })),
      writeSnippet: vi.fn(async (repoRoot, snippet) => ({ path: `${repoRoot}/snippets/${snippet.id}.json` })),
      getSnippet: vi.fn(async (_repoRoot, id) => ({
        snippet: {
          id,
          ts: "2026-04-16T00:00:00.000Z",
          kind: "note" as const,
          title: "Saved snippet",
          preview: "Saved preview",
          body: "Saved body",
          tags: ["ops"],
        },
      })),
      tailSnippets: vi.fn(async () => ({
        snippets: [
          {
            id: "snippet-1",
            ts: "2026-04-16T00:00:00.000Z",
            kind: "note" as const,
            title: "Saved snippet",
            preview: "Saved preview",
            tags: ["ops"],
          },
        ],
      })),
      searchSnippets: vi.fn(async (_repoRoot, query, _limit, mode) => ({
        mode,
        snippets: [
          {
            id: "snippet-1",
            ts: "2026-04-16T00:00:00.000Z",
            kind: "note" as const,
            title: `Match for ${query}`,
            preview: "Saved preview",
            tags: ["ops"],
            ...(mode === "semantic" ? { score: 0.9 } : {}),
          },
        ],
      })),
    };

    const client = createClient(
      createClientOptions({
        deps: {
          journalStore,
        },
      }),
    );

    const snippet = {
      id: "snippet-1",
      ts: "2026-04-16T00:00:00.000Z",
      kind: "note" as const,
      title: "Saved snippet",
      preview: "Saved preview",
      body: "Saved body",
      tags: ["ops"],
    };

    const writeResult = await client.journal.writeSnippet(snippet, invocation("trace-write"));
    expect(writeResult.path).toBe("/tmp/workspace/snippets/snippet-1.json");
    expect(journalStore.writeSnippet).toHaveBeenCalledWith("/tmp/workspace", snippet);

    const getResult = await client.journal.getSnippet({ id: "snippet-1" }, invocation("trace-get"));
    expect(getResult.snippet?.id).toBe("snippet-1");

    const tail = await client.journal.tailSnippets({ limit: 1 }, invocation("trace-tail"));
    expect(tail.snippets).toHaveLength(1);

    const search = await client.journal.searchSnippets(
      { query: "Saved", limit: 1, mode: "semantic" },
      invocation("trace-search"),
    );
    expect(search.mode).toBe("semantic");
    expect(search.snippets[0]?.score).toBe(0.9);
  });

  it("routes security procedures through the bound securityRuntime", async () => {
    const securityRuntime: SecurityRuntime = {
      securityCheck: vi.fn(async (repoRoot, mode) => ({
        ok: true,
        findings: [],
        summary: "vulns=0, untrusted=0, secrets=0",
        timestamp: "2026-04-16T00:00:00.000Z",
        mode,
        meta: { repoRoot },
        reportPath: `${repoRoot}/.rawr/security/latest.json`,
      })),
      gateEnable: vi.fn(async (repoRoot, pluginId, _riskTolerance, mode) => ({
        allowed: true,
        requiresForce: false,
        report: {
          ok: true,
          findings: [],
          summary: "vulns=0, untrusted=0, secrets=0",
          timestamp: "2026-04-16T00:00:00.000Z",
          mode,
          meta: { pluginId, repoRoot },
          reportPath: `${repoRoot}/.rawr/security/latest.json`,
        },
      })),
      getSecurityReport: vi.fn(async (repoRoot) => ({
        ok: true,
        findings: [],
        summary: "vulns=0, untrusted=0, secrets=0",
        timestamp: "2026-04-16T00:00:00.000Z",
        mode: "repo" as const,
        meta: { repoRoot },
      })),
    };

    const client = createClient(
      createClientOptions({
        deps: {
          securityRuntime,
        },
      }),
    );

    const report = await client.security.securityCheck({ mode: "repo" }, invocation("trace-security"));
    expect(report.reportPath).toBe("/tmp/workspace/.rawr/security/latest.json");
    expect(securityRuntime.securityCheck).toHaveBeenCalledWith("/tmp/workspace", "repo");

    const evaluation = await client.security.gateEnable(
      {
        pluginId: "@rawr/plugin-mfe-demo",
        riskTolerance: "balanced",
        mode: "staged",
      },
      invocation("trace-gate"),
    );
    expect(evaluation.allowed).toBe(true);
    expect(securityRuntime.gateEnable).toHaveBeenCalledWith(
      "/tmp/workspace",
      "@rawr/plugin-mfe-demo",
      "balanced",
      "staged",
    );

    const latest = await client.security.getSecurityReport({}, invocation("trace-report"));
    expect(latest?.meta?.repoRoot).toBe("/tmp/workspace");
  });
});
