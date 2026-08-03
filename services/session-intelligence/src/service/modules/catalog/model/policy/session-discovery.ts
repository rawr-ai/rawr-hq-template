import type { DiscoveredSessionFile, SessionSourceFilter } from "../../../../model/dto";
import { discoverCodexSessionsFromIndex } from "../../../../model/policy";
import type { CodexDiscoveryStore, SessionSourceRuntime } from "../../../../model/ports";

/** Discovers catalog candidates while preserving service-owned Codex index policy. */
export async function discoverCatalogSessions(
  sourceRuntime: SessionSourceRuntime,
  codexDiscoveryStore: CodexDiscoveryStore,
  input: {
    source: SessionSourceFilter;
    limit: number;
    project?: string;
  }
): Promise<DiscoveredSessionFile[]> {
  if (input.source === "claude") {
    return sourceRuntime.discoverClaudeSessions({
      limit: input.limit || undefined,
      project: input.project,
    });
  }

  const out: DiscoveredSessionFile[] = [];
  if (input.source === "all") {
    out.push(
      ...(await sourceRuntime.discoverClaudeSessions({
        limit: input.limit || undefined,
        project: input.project,
      }))
    );
  }

  const indexed = await discoverCodexSessionsFromIndex(
    sourceRuntime,
    codexDiscoveryStore,
    input.limit
  );
  out.push(...indexed);

  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return input.limit ? out.slice(0, input.limit) : out;
}
