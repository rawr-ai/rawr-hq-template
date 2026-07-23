export function hasStrictDescendantHomes(
  disposableRoot: string,
  targets: readonly Readonly<{ home: string }>[]
): boolean {
  const descendantPrefix = `${disposableRoot}/`;
  return targets.every((target) => target.home.startsWith(descendantPrefix));
}
