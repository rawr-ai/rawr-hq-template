import { Value } from "typebox/value";
import {
  clampJournalCandidateLimit,
  type ConfigValidationIssue,
  RawrConfigV1Schema,
  type RawrConfig,
  type RawrConfigV1,
} from "../entities";

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

  const normalized: RawrConfig = {
    ...cfg,
    plugins: cfg.plugins,
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
  };

  const model = normalized.journal?.semantic?.model;
  if (typeof model === "string" && model.trim().length === 0) {
    return { ok: false, issues: [{ path: "journal.semantic.model", message: "model must be non-empty" }] };
  }

  return { ok: true, config: normalized };
}
