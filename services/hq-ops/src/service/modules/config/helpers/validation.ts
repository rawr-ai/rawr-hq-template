import { Value } from "typebox/value";
import {
  clampJournalCandidateLimit,
  RawrConfigV1Schema,
  type RawrConfig,
  type RawrConfigV1,
  type SyncDestination,
  type SyncProvider,
} from "../entities";
import type { ConfigValidationIssue } from "../contract";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

function formatTypeBoxIssues(maybeConfig: unknown): ConfigValidationIssue[] {
  const errors = [...Value.Errors(RawrConfigV1Schema, maybeConfig)] as any[];
  return errors.map((e) => {
    const ip = typeof e.instancePath === "string" ? e.instancePath : "";
    return {
      path: ip.length ? ip.replace(/^\//, "").replace(/\//g, ".") : "(root)",
      message: typeof e.message === "string" ? e.message : "invalid",
    };
  });
}

function normalizeDestinations(
  dests: SyncDestination[] | undefined,
): SyncDestination[] | undefined {
  if (!dests) return undefined;
  return dests.map((d) => {
    const out: any = {
      ...d,
      enabled: d.enabled ?? true,
      id: String(d.id).trim(),
    };
    if (typeof d.rootPath === "string") out.rootPath = d.rootPath.trim();
    return out as SyncDestination;
  });
}

function normalizeProvider(
  providerKey: "codex" | "claude",
  provider: SyncProvider | undefined,
): SyncProvider | undefined {
  if (!provider) return undefined;
  return {
    ...provider,
    includeAgents: provider.includeAgents ?? (providerKey === "claude"),
    destinations: normalizeDestinations(provider.destinations),
  };
}

function validateNonEmptyTrimmed(pathKey: string, value: string | undefined, issues: ConfigValidationIssue[]) {
  if (value === undefined) return;
  if (value.trim().length === 0) issues.push({ path: pathKey, message: "must be non-empty" });
}

function validateSyncDestinations(cfg: RawrConfigV1, issues: ConfigValidationIssue[]) {
  const providers = cfg.sync?.providers;
  if (!providers) return;

  const checkProvider = (providerKey: "codex" | "claude") => {
    const dests = providers[providerKey]?.destinations ?? [];
    for (let i = 0; i < dests.length; i += 1) {
      const d = dests[i]!;
      const base = `sync.providers.${providerKey}.destinations.${i}`;
      validateNonEmptyTrimmed(`${base}.id`, d.id, issues);
    }
  };

  checkProvider("codex");
  checkProvider("claude");
}

export function formatIssues(issues: ConfigValidationIssue[]): string {
  return issues.map((i) => `${i.path}: ${i.message}`).join("\n");
}

export function validateRawrConfig(
  maybeConfig: unknown,
): { ok: true; config: RawrConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  if (!Value.Check(RawrConfigV1Schema, maybeConfig)) {
    return { ok: false, issues: formatTypeBoxIssues(maybeConfig) };
  }

  const cfg = maybeConfig as RawrConfigV1;

  const issues: ConfigValidationIssue[] = [];
  validateSyncDestinations(cfg, issues);
  if (issues.length) return { ok: false, issues };

  const normalized: RawrConfig = {
    ...cfg,
    plugins: cfg.plugins
      ? {
          ...cfg.plugins,
          channels: {
            workspace: { enabled: cfg.plugins.channels?.workspace?.enabled ?? true },
            external: { enabled: cfg.plugins.channels?.external?.enabled ?? false },
          },
          defaultRiskTolerance: cfg.plugins.defaultRiskTolerance,
        }
      : {
          channels: { workspace: { enabled: true }, external: { enabled: false } },
        },
    journal: cfg.journal?.semantic
      ? {
          ...cfg.journal,
          semantic: {
            ...cfg.journal.semantic,
            candidateLimit: clampJournalCandidateLimit(cfg.journal.semantic.candidateLimit),
            model: cfg.journal.semantic.model,
          },
        }
      : cfg.journal,
    server: cfg.server
      ? {
          ...cfg.server,
          port: typeof cfg.server.port === "number" ? clampInt(cfg.server.port, 1, 65535) : cfg.server.port,
          baseUrl: cfg.server.baseUrl,
        }
      : cfg.server,
    sync: cfg.sync
      ? {
          ...cfg.sync,
          sources: cfg.sync.sources
            ? {
                ...cfg.sync.sources,
                paths: cfg.sync.sources.paths?.map((p) => String(p).trim()).filter((p) => p.length > 0),
              }
            : cfg.sync.sources,
          providers: cfg.sync.providers
            ? {
                ...cfg.sync.providers,
                codex: normalizeProvider("codex", cfg.sync.providers.codex),
                claude: normalizeProvider("claude", cfg.sync.providers.claude),
              }
            : cfg.sync.providers,
        }
      : cfg.sync,
  };

  const model = normalized.journal?.semantic?.model;
  if (typeof model === "string" && model.trim().length === 0) {
    return { ok: false, issues: [{ path: "journal.semantic.model", message: "model must be non-empty" }] };
  }

  return { ok: true, config: normalized };
}
