import { NativeProviderHomeSchema } from "@habitat-ai/resource-native-agent-provider";
import { Value } from "typebox/value";

/** Reserved direct child that keeps one native marketplace reachable for a disposable root. */
export const DISPOSABLE_MARKETPLACE_DIRECTORY = ".rawr-agent-plugin-marketplace";

/** Confirms every provider target carries the native resource's canonical home shape. */
export function hasCanonicalProviderHomes(targets: readonly Readonly<{ home: string }>[]): boolean {
  return targets.every((target) => isCanonicalProviderHome(target.home));
}

/** Admits one canonical non-root native-provider home. */
export function isCanonicalProviderHome(value: string): boolean {
  return Value.Check(NativeProviderHomeSchema, value);
}

/** Confirms every provider home is owned by the explicit disposable parent. */
export function hasStrictDescendantHomes(
  disposableRoot: string,
  targets: readonly Readonly<{ home: string }>[]
): boolean {
  const descendantPrefix = `${disposableRoot}/`;
  return targets.every((target) => target.home.startsWith(descendantPrefix));
}

/** Confirms no two provider homes are equal or contain one another. */
export function hasPairwiseDisjointProviderHomes(
  targets: readonly Readonly<{ home: string }>[]
): boolean {
  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    const left = targets[leftIndex]!.home;
    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const right = targets[rightIndex]!.home;
      if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) {
        return false;
      }
    }
  }
  return true;
}

/** Prevents two canonical absolute paths from containing one another. */
export function areDisjointPaths(left: string, right: string): boolean {
  return left !== right && !left.startsWith(`${right}/`) && !right.startsWith(`${left}/`);
}

/** Returns the one stable marketplace root owned by a disposable test parent. */
export function disposableMarketplaceRoot(disposableRoot: string): string {
  return `${disposableRoot}/${DISPOSABLE_MARKETPLACE_DIRECTORY}`;
}

/** Prevents the stable marketplace and any provider home from containing one another. */
export function hasDisjointMarketplaceRoot(
  disposableRoot: string,
  targets: readonly Readonly<{ home: string }>[]
): boolean {
  const marketplaceRoot = disposableMarketplaceRoot(disposableRoot);
  return targets.every((target) => areDisjointPaths(marketplaceRoot, target.home));
}
