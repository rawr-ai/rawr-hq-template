type NamedSurfaceKind = "api" | "workflow";
type NamedSurface = "contract" | "router";

export function mergeNamedSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  input: Readonly<{
    kind: NamedSurfaceKind;
    surface: NamedSurface;
  }>,
): TTree {
  const result: Record<string, unknown> = {};

  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      if (key in result) {
        throw new Error(`duplicate ${input.kind} ${input.surface} namespace: ${key}`);
      }
      result[key] = value;
    }
  }

  return result as TTree;
}
