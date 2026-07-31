import { parseStaticDefaultConfig, pickConfigExport } from "../model/helpers/config-module";
import { rawrConfigPath } from "../model/helpers/config-paths";
import { formatIssues, validateRawrConfig } from "../model/policy/config-validation";
import { module } from "../module";

/** Loads and validates the current repository's HQ configuration module. */
export const getWorkspaceConfig = module.getWorkspaceConfig.handler(async ({ context }) => {
  const configPath = rawrConfigPath(context.path, context.repoRoot);
  const stat = await context.fs.stat(configPath);
  if (!stat?.isFile) return { config: null, path: null, warnings: [] };

  const warnings: string[] = [];
  try {
    const baseHref = context.path.toFileHref(configPath);
    const href = `${baseHref}?mtime=${encodeURIComponent(String(stat.mtimeMs))}`;
    const configModule = await import(href);
    const validated = validateRawrConfig(pickConfigExport(configModule));
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
  } catch (error) {
    const raw = await context.fs.readText(configPath);
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
      error: {
        message: "Failed to load rawr.config.ts",
        cause: String(error),
      },
    };
  }
});
