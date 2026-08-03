import { NativeProviderHomeSchema } from "@habitat-ai/rawr-resource-native-agent-provider";
import { Value } from "typebox/value";

export function hasCanonicalProviderHomes(targets: readonly Readonly<{ home: string }>[]): boolean {
  return targets.every((target) => isCanonicalProviderHome(target.home));
}

export function isCanonicalProviderHome(value: string): boolean {
  return Value.Check(NativeProviderHomeSchema, value);
}

export function hasStrictDescendantHomes(
  disposableRoot: string,
  targets: readonly Readonly<{ home: string }>[]
): boolean {
  const descendantPrefix = `${disposableRoot}/`;
  return targets.every((target) => target.home.startsWith(descendantPrefix));
}
