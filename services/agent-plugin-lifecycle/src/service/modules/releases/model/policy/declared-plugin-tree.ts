import {
  compareCanonicalText,
  parsePluginId,
  type PluginId,
  type ReleaseRelativePath,
} from "../../../../shared/release";
import type { SourceEligibilityIssue } from "../../../../model/dto/releases/content-workspace";

export function validateDeclaredPluginTree(input: Readonly<{
  pluginRoot: ReleaseRelativePath;
  paths: readonly ReleaseRelativePath[];
  declaredPluginIds: readonly PluginId[];
}>): SourceEligibilityIssue | undefined {
  const rootPrefix = `${input.pluginRoot}/`;
  const observedChildren = new Set<string>();
  const rootFileChildren = new Set<string>();
  for (const path of input.paths) {
    if (!path.startsWith(rootPrefix)) continue;
    const relative = path.slice(rootPrefix.length);
    const separator = relative.indexOf("/");
    const child = separator === -1 ? relative : relative.slice(0, separator);
    observedChildren.add(child);
    if (separator === -1) rootFileChildren.add(child);
  }
  const observedPluginIds: PluginId[] = [];

  for (const child of [...observedChildren].sort(compareCanonicalText)) {
    const parsed = parsePluginId(child, "pluginTree.child");
    if (!parsed.ok || parsed.value !== child || rootFileChildren.has(child)) {
      return Object.freeze({
        code: "PayloadMismatch",
        detail: `plugin tree contains noncanonical child ${child}`,
      });
    }
    observedPluginIds.push(parsed.value);
  }

  const declaredPluginIds = new Set(input.declaredPluginIds);
  const undeclaredPluginId = observedPluginIds.find((pluginId) => !declaredPluginIds.has(pluginId));

  return undeclaredPluginId === undefined
    ? undefined
    : Object.freeze({
      code: "PayloadMismatch",
      detail: `plugin tree contains undeclared member ${undeclaredPluginId}`,
    });
}
