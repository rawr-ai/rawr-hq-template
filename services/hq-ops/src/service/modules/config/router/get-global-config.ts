import { rawrGlobalConfigPath } from "../model/policy/config-paths";
import { formatIssues, validateRawrConfig } from "../model/policy/config-validation";
import { module } from "../module";

/** Loads and validates the host user's global HQ configuration document. */
export const getGlobalConfig = module.getGlobalConfig.handler(async ({ context }) => {
  const configPath = rawrGlobalConfigPath(context.path);
  const stat = await context.fs.stat(configPath);
  if (!stat?.isFile) return { config: null, path: null, warnings: [] };

  const warnings: string[] = [];
  try {
    const raw = await context.fs.readText(configPath);
    if (raw === null) return { config: null, path: null, warnings };

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
  } catch (error) {
    return {
      config: null,
      path: configPath,
      warnings,
      error: {
        message: "Failed to load ~/.rawr/config.json",
        cause: String(error),
      },
    };
  }
});
