import type { LoadRawrConfigResult, RawrConfig } from "../model/dto/config.dto";
import { parseStaticDefaultConfig, pickConfigExport } from "../model/policy/config-module";
import { rawrConfigPath, rawrGlobalConfigPath } from "../model/policy/config-paths";
import { formatIssues, validateRawrConfig } from "../model/policy/config-validation";
import { module } from "../module";

/** Loads both configuration layers and applies workspace-over-global precedence. */
export const getLayeredConfig = module.getLayeredConfig.handler(async ({ context }) => {
  const loadGlobal = async (): Promise<LoadRawrConfigResult> => {
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
  };

  const loadWorkspace = async (): Promise<LoadRawrConfigResult> => {
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
  };

  const [global, workspace] = await Promise.all([loadGlobal(), loadWorkspace()]);
  const globalConfig = global.config;
  const workspaceConfig = workspace.config;

  if (!globalConfig && !workspaceConfig) {
    return { global, workspace, merged: null };
  }

  const merged: RawrConfig = {
    version: 1,
    journal: {
      ...(globalConfig?.journal ?? {}),
      ...(workspaceConfig?.journal ?? {}),
    },
    server:
      globalConfig?.server || workspaceConfig?.server
        ? {
            port: workspaceConfig?.server?.port ?? globalConfig?.server?.port,
            baseUrl: workspaceConfig?.server?.baseUrl ?? globalConfig?.server?.baseUrl,
          }
        : undefined,
  };

  const validated = validateRawrConfig(merged);
  return {
    global,
    workspace,
    merged: validated.ok ? validated.config : null,
  };
});
