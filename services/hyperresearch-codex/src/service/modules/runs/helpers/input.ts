import type { HyperresearchTier } from "../../../shared/entities";

export type TierRequest = "auto" | "light" | "full";

export function slugifyQuery(query: string): string {
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "hyperresearch";
}

export function resolveRequestedTier(input: { tier?: TierRequest }): {
  tier: HyperresearchTier;
  tierSource: "user" | "auto-default";
} {
  if (input.tier === "full") return { tier: "full", tierSource: "user" };
  if (input.tier === "light") return { tier: "light", tierSource: "user" };
  return { tier: "light", tierSource: "auto-default" };
}
