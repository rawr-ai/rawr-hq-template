import type { ConfigResources } from "./paths";
import { rawrConfigPath, rawrGlobalConfigPath } from "./paths";
import type { LoadRawrConfigResult } from "../contract";
import { formatIssues, validateRawrConfig } from "./validation";

function pickConfigExport(mod: unknown): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

function parseStaticDefaultConfig(source: string): unknown | null {
  const match = source.match(/^\s*export\s+default\s+([\s\S]*?);?\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]!);
  } catch {
    return null;
  }
}

export async function loadRawrConfig(resources: ConfigResources, repoRoot: string): Promise<LoadRawrConfigResult> {
  const configPath = rawrConfigPath(resources, repoRoot);

  let st: { mtimeMs: number } | null = null;
  const stat = await resources.fs.stat(configPath);
  if (!stat) return { config: null, path: null, warnings: [] };
  if (!stat.isFile) return { config: null, path: null, warnings: [] };
  st = { mtimeMs: stat.mtimeMs };

  const warnings: string[] = [];
  try {
    const baseHref = resources.path.toFileHref(configPath);
    const href = `${baseHref}?mtime=${encodeURIComponent(String(st?.mtimeMs ?? Date.now()))}`;
    const mod = await import(href);
    const exported = pickConfigExport(mod);

    const validated = validateRawrConfig(exported);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: {
          message: "Invalid rawr.config.ts",
          cause: formatIssues(validated.issues),
          issues: validated.issues,
        },
      };
    }

    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    const raw = await resources.fs.readText(configPath);
    const staticConfig = raw === null ? null : parseStaticDefaultConfig(raw);
    if (staticConfig !== null) {
      const validated = validateRawrConfig(staticConfig);
      if (!validated.ok) {
        return {
          config: null,
          path: configPath,
          warnings,
          error: {
            message: "Invalid rawr.config.ts",
            cause: formatIssues(validated.issues),
            issues: validated.issues,
          },
        };
      }

      return { config: validated.config, path: configPath, warnings };
    }

    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load rawr.config.ts", cause: String(err) },
    };
  }
}

export async function loadGlobalRawrConfig(resources: ConfigResources): Promise<LoadRawrConfigResult> {
  const configPath = rawrGlobalConfigPath(resources);

  const stat = await resources.fs.stat(configPath);
  if (!stat) return { config: null, path: null, warnings: [] };
  if (!stat.isFile) return { config: null, path: null, warnings: [] };

  const warnings: string[] = [];
  try {
    const raw = await resources.fs.readText(configPath);
    if (raw === null) return { config: null, path: null, warnings: [] };
    const parsedJson = JSON.parse(raw) as unknown;
    const validated = validateRawrConfig(parsedJson);
    if (!validated.ok) {
      return {
        config: null,
        path: configPath,
        warnings,
        error: {
          message: "Invalid ~/.rawr/config.json",
          cause: formatIssues(validated.issues),
          issues: validated.issues,
        },
      };
    }
    return { config: validated.config, path: configPath, warnings };
  } catch (err) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: { message: "Failed to load ~/.rawr/config.json", cause: String(err) },
    };
  }
}
