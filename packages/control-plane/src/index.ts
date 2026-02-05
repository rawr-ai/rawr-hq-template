import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

export type RiskTolerance = "strict" | "balanced" | "permissive" | "off";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

const RiskToleranceSchema = z.union([
  z.literal("strict"),
  z.literal("balanced"),
  z.literal("permissive"),
  z.literal("off"),
]);

const RawrConfigV1Schema = z.object({
  version: z.literal(1),
  plugins: z
    .object({
      defaultRiskTolerance: RiskToleranceSchema.optional(),
    })
    .optional(),
  journal: z
    .object({
      semantic: z
        .object({
          candidateLimit: z
            .preprocess(
              (v) => (typeof v === "number" ? clampInt(v, 1, 500) : v),
              z.number().int(),
            )
            .optional(),
          model: z
            .string()
            .transform((s) => s.trim())
            .refine((s) => s.length > 0, "model must be non-empty")
            .optional(),
        })
        .optional(),
    })
    .optional(),
  server: z
    .object({
      port: z
        .preprocess(
          (v) => (typeof v === "number" ? clampInt(v, 1, 65535) : v),
          z.number().int(),
        )
        .optional(),
      baseUrl: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, "baseUrl must be non-empty")
        .optional(),
    })
    .optional(),
});

export type RawrConfigV1 = z.infer<typeof RawrConfigV1Schema>;

export type RawrConfig = RawrConfigV1;

export function rawrConfigPath(repoRoot: string): string {
  return path.join(repoRoot, "rawr.config.ts");
}

export function validateRawrConfig(
  maybeConfig: unknown,
): { ok: true; config: RawrConfig } | { ok: false; issues: Array<{ path: string; message: string }> } {
  const parsed = RawrConfigV1Schema.safeParse(maybeConfig);
  if (parsed.success) {
    const cfg = parsed.data;
    const normalized: RawrConfig = {
      ...cfg,
      journal: cfg.journal?.semantic
        ? {
            ...cfg.journal,
            semantic: {
              ...cfg.journal.semantic,
              candidateLimit: cfg.journal.semantic.candidateLimit ?? 200,
            },
          }
        : cfg.journal,
    };
    return { ok: true, config: normalized };
  }

  const issues = parsed.error.issues.map((i) => ({
    path: i.path.length ? i.path.map(String).join(".") : "(root)",
    message: i.message,
  }));
  return { ok: false, issues };
}

export type LoadRawrConfigResult = {
  config: RawrConfig | null;
  path: string | null;
  warnings: string[];
  error?: { message: string; cause?: string };
};

function formatIssues(issues: Array<{ path: string; message: string }>): string {
  return issues.map((i) => `${i.path}: ${i.message}`).join("\n");
}

function pickConfigExport(mod: any): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

export async function loadRawrConfig(repoRoot: string): Promise<LoadRawrConfigResult> {
  const configPath = rawrConfigPath(repoRoot);

  let st: { mtimeMs: number } | null = null;
  try {
    const stat = await fs.stat(configPath);
    if (!stat.isFile()) return { config: null, path: null, warnings: [] };
    st = { mtimeMs: stat.mtimeMs };
  } catch {
    return { config: null, path: null, warnings: [] };
  }

  const warnings: string[] = [];
  try {
    const baseHref = pathToFileURL(configPath).href;
    const href = `${baseHref}?mtime=${encodeURIComponent(String(st?.mtimeMs ?? Date.now()))}`;
    const mod = (await import(href)) as any;
    const exported = pickConfigExport(mod);

    const validated = validateRawrConfig(exported);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: { message: "Invalid rawr.config.ts", cause: formatIssues(validated.issues) },
      };
    }

    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load rawr.config.ts", cause: String(err) },
    };
  }
}
