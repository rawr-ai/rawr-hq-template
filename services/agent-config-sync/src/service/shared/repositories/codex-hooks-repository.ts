import type { ContentFile } from "../entities";
import type { AgentConfigSyncPathResources, AgentConfigSyncResources } from "../resources";

export type CodexHooksFile = {
  hooks?: Record<string, Array<{
    matcher?: string;
    hooks?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }>>;
  [key: string]: unknown;
};

export function codexHookMarker(pluginName: string): string {
  return `RAWR ${pluginName}:`;
}

export async function buildCodexHooksFile(input: {
  pluginName: string;
  hookConfigs: ContentFile[];
  hookScripts: ContentFile[];
  hooksDir: string;
  existing: unknown;
  resources: AgentConfigSyncResources;
}): Promise<CodexHooksFile | null> {
  if (input.hookConfigs.length === 0) return null;

  const next = pruneCodexHooksForPlugin({
    pluginName: input.pluginName,
    existing: input.existing,
  });
  const targetHooks = next.hooks ?? {};

  for (const configFile of input.hookConfigs) {
    const config = await input.resources.files.readJsonFile<unknown>(configFile.absPath);
    const parsed = asHooksFile(config);
    for (const [event, groups] of Object.entries(parsed.hooks ?? {})) {
      targetHooks[event] = [
        ...(targetHooks[event] ?? []),
        ...groups.map((group) => normalizeManagedGroup({
          group,
          pluginName: input.pluginName,
          source: configFile.name,
          hookScripts: input.hookScripts,
          hooksDir: input.hooksDir,
          pathOps: input.resources.path,
        })),
      ];
    }
  }

  next.hooks = targetHooks;
  return next;
}

export function pruneCodexHooksForPlugin(input: {
  pluginName: string;
  existing: unknown;
}): CodexHooksFile {
  const marker = codexHookMarker(input.pluginName);
  const next = asHooksFile(input.existing);
  const hooks = next.hooks ?? {};

  for (const [event, groups] of Object.entries(hooks)) {
    hooks[event] = groups
      .map((group) => ({
        ...group,
        hooks: (group.hooks ?? []).filter((hook) =>
          !(typeof hook.statusMessage === "string" && hook.statusMessage.startsWith(marker))
        ),
      }))
      .filter((group) => (group.hooks ?? []).length > 0);
    if (hooks[event].length === 0) delete hooks[event];
  }

  next.hooks = hooks;
  return next;
}

export function buildHookCommand(absPath: string, pathOps: AgentConfigSyncPathResources): string {
  const ext = pathOps.extname(absPath);
  const quoted = JSON.stringify(absPath);
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return `node ${quoted}`;
  if (ext === ".py") return `python3 ${quoted}`;
  if (ext === ".sh") return `bash ${quoted}`;
  return quoted;
}

function normalizeManagedGroup(input: {
  group: NonNullable<CodexHooksFile["hooks"]>[string][number];
  pluginName: string;
  source: string;
  hookScripts: ContentFile[];
  hooksDir: string;
  pathOps: AgentConfigSyncPathResources;
}): NonNullable<CodexHooksFile["hooks"]>[string][number] {
  return {
    ...input.group,
    hooks: (input.group.hooks ?? []).map((hook, index) => normalizeManagedHandler({
      hook,
      index,
      pluginName: input.pluginName,
      source: input.source,
      hookScripts: input.hookScripts,
      hooksDir: input.hooksDir,
      pathOps: input.pathOps,
    })),
  };
}

function normalizeManagedHandler(input: {
  hook: Record<string, unknown>;
  index: number;
  pluginName: string;
  source: string;
  hookScripts: ContentFile[];
  hooksDir: string;
  pathOps: AgentConfigSyncPathResources;
}): Record<string, unknown> {
  const marker = codexHookMarker(input.pluginName);
  const command = typeof input.hook.command === "string"
    ? rewriteManagedHookCommand({
      command: input.hook.command,
      hookScripts: input.hookScripts,
      hooksDir: input.hooksDir,
      pathOps: input.pathOps,
    })
    : input.hook.command;
  return {
    ...input.hook,
    ...(typeof command === "string" ? { command } : {}),
    statusMessage: `${marker} ${input.source}#${input.index + 1}`,
  };
}

function rewriteManagedHookCommand(input: {
  command: string;
  hookScripts: ContentFile[];
  hooksDir: string;
  pathOps: AgentConfigSyncPathResources;
}): string {
  let command = input.command;
  for (const script of input.hookScripts) {
    const absPath = input.pathOps.join(input.hooksDir, script.name);
    const names = new Set([script.name, input.pathOps.basename(script.absPath)]);
    const replacements = [...names].flatMap((name) => [
      `./hooks/${name}`,
      `hooks/${name}`,
      `./${name}`,
    ]);
    for (const candidate of replacements) {
      command = command
        .replaceAll(JSON.stringify(candidate), JSON.stringify(absPath))
        .replaceAll(`'${candidate}'`, JSON.stringify(absPath))
        .replaceAll(candidate, JSON.stringify(absPath));
    }
  }
  return command;
}

function asHooksFile(value: unknown): CodexHooksFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { hooks: {} };
  const record = value as CodexHooksFile;
  if (!record.hooks || typeof record.hooks !== "object" || Array.isArray(record.hooks)) return { ...record, hooks: {} };
  const hooks: NonNullable<CodexHooksFile["hooks"]> = {};
  for (const [event, groups] of Object.entries(record.hooks)) {
    hooks[event] = Array.isArray(groups) ? groups : [];
  }
  return { ...record, hooks };
}
