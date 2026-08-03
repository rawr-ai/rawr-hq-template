import { Value } from "typebox/value";
import {
  type ConfigValidationIssue,
  type RawrConfig,
  type RawrConfigV1,
  RawrConfigV1Schema,
} from "../dto/config.dto";
import { clampInteger } from "./integer";

function clampJournalCandidateLimit(value: number | undefined): number {
  return clampInteger(value ?? 200, 1, 500);
}

function formatTypeBoxIssues(maybeConfig: unknown): ConfigValidationIssue[] {
  const errors = [...Value.Errors(RawrConfigV1Schema, maybeConfig)];
  return errors.map((error) => {
    const issue = error as { instancePath?: unknown; message?: unknown };
    const instancePath = typeof issue.instancePath === "string" ? issue.instancePath : "";
    return {
      path: instancePath.length ? instancePath.replace(/^\//, "").replace(/\//g, ".") : "(root)",
      message: typeof issue.message === "string" ? issue.message : "invalid",
    };
  });
}

/** Formats validation issues for the legacy configuration load cause field. */
export function formatIssues(issues: ConfigValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}

/** Validates and normalizes one candidate HQ configuration document. */
export function validateRawrConfig(
  maybeConfig: unknown
): { ok: true; config: RawrConfig } | { ok: false; issues: ConfigValidationIssue[] } {
  if (!Value.Check(RawrConfigV1Schema, maybeConfig)) {
    return { ok: false, issues: formatTypeBoxIssues(maybeConfig) };
  }

  const config = maybeConfig as RawrConfigV1;
  const normalized: RawrConfig = {
    ...config,
    journal: config.journal?.semantic
      ? {
          ...config.journal,
          semantic: {
            ...config.journal.semantic,
            candidateLimit: clampJournalCandidateLimit(config.journal.semantic.candidateLimit),
            model: config.journal.semantic.model,
          },
        }
      : config.journal,
    server: config.server
      ? {
          ...config.server,
          port:
            typeof config.server.port === "number"
              ? clampInteger(config.server.port, 1, 65535)
              : config.server.port,
          baseUrl: config.server.baseUrl,
        }
      : config.server,
  };

  const model = normalized.journal?.semantic?.model;
  if (typeof model === "string" && model.trim().length === 0) {
    return {
      ok: false,
      issues: [{ path: "journal.semantic.model", message: "model must be non-empty" }],
    };
  }

  return { ok: true, config: normalized };
}
