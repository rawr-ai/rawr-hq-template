import type { DiscoveredSessionFile, SessionSourceFilter } from "../../../../model/dto";
import { discoverCodexSessionsFromIndexOrNull } from "../../../../model/policy";
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
    return sourceRuntime.discoverSessions({
      source: "claude",
      limit: input.limit || undefined,
      project: input.project,
    });
  }

  const out: DiscoveredSessionFile[] = [];
  if (input.source === "all") {
    out.push(
      ...(await sourceRuntime.discoverSessions({
        source: "claude",
        limit: input.limit || undefined,
        project: input.project,
      }))
    );
  }

  const indexed = await discoverCodexSessionsFromIndexOrNull(
    sourceRuntime,
    codexDiscoveryStore,
    input.limit
  );
  if (indexed) {
    out.push(...indexed);
  } else {
    out.push(
      ...(await sourceRuntime.discoverSessions({
        source: "codex",
        limit: input.limit || undefined,
      }))
    );
  }

  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return input.limit ? out.slice(0, input.limit) : out;
}
