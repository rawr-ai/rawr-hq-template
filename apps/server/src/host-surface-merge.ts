/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host materializer support
 *
 * Owns:
 * - host-local merging of already declared or already bound surface trees just
 *   before executable router materialization
 *
 * Must not own:
 * - plugin declaration choice
 * - host satisfier construction
 * - route/request/process materialization itself
 *
 * Canonical:
 * - host realization may depend on this helper without reaching back into
 *   shared HQ SDK composition support on the executable path
 */
function isMergeableHostSurfaceNode(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !("~orpc" in (value as Record<string, unknown>));
}

export function mergeRawrHostSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  path: readonly string[] = [],
): TTree {
  const merged: Record<string, unknown> = {};

  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      if (!(key in merged)) {
        merged[key] = value;
        continue;
      }

      const existing = merged[key];
      if (isMergeableHostSurfaceNode(existing) && isMergeableHostSurfaceNode(value)) {
        merged[key] = mergeRawrHostSurfaceTrees(
          [existing, value] as readonly Record<string, unknown>[],
          [...path, key],
        );
        continue;
      }

      throw new Error(`duplicate host surface at ${[...path, key].join(".")}`);
    }
  }

  return merged as TTree;
}
