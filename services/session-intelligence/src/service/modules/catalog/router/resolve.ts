import type { SessionStatus } from "../../../model/dto";
import {
  detectSessionFormat,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  inferStatusFromPath,
  looksLikePath,
  stem,
} from "../../../model/policy";
import { discoverCatalogSessions } from "../model/policy";
import { module } from "../module";

/** Resolves a path or provider identity to one normalized session reference. */
export const resolve = module.resolve.handler(async ({ context, input, errors }) => {
  const clean = input.session.trim();
  let resolvedPath: string | null = null;
  let status: SessionStatus | undefined;

  if (looksLikePath(clean)) {
    if (await context.sourceRuntime.statFile({ path: clean })) resolvedPath = clean;
  } else {
    const candidates = await discoverCatalogSessions(
      context.sourceRuntime,
      context.codexDiscoveryStore,
      { source: input.source, limit: 0 }
    );
    const claude = candidates.find(
      (candidate) => candidate.source === "claude" && stem(candidate.path) === clean
    );
    const codex = candidates.find(
      (candidate) =>
        candidate.source === "codex" &&
        stem(candidate.path).toLowerCase().includes(clean.toLowerCase())
    );
    const candidate = claude ?? codex;
    if (candidate) {
      resolvedPath = candidate.path;
      status = candidate.status;
    }
  }

  if (!resolvedPath) {
    const message = `Session not found: ${input.session}`;
    throw errors.SESSION_NOT_FOUND({ message, data: { message } });
  }

  const format = await detectSessionFormat(context.sourceRuntime, resolvedPath);
  const stat = await context.sourceRuntime.statFile({ path: resolvedPath });
  if (!stat) {
    const message = `Session not found: ${input.session}`;
    throw errors.SESSION_NOT_FOUND({ message, data: { message } });
  }

  if (format === "claude") {
    return {
      resolved: {
        path: resolvedPath,
        source: "claude" as const,
        modified: new Date(stat.modifiedMs).toISOString(),
        sizeBytes: stat.sizeBytes,
      },
      metadata: await getClaudeSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }
  if (format === "codex") {
    return {
      resolved: {
        path: resolvedPath,
        source: "codex" as const,
        status: status ?? inferStatusFromPath(resolvedPath),
        modified: new Date(stat.modifiedMs).toISOString(),
        sizeBytes: stat.sizeBytes,
      },
      metadata: await getCodexSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }

  const message = `Unknown session format: ${resolvedPath}`;
  throw errors.UNKNOWN_SESSION_FORMAT({ message, data: { message } });
});
