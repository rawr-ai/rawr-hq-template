import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { VersionedContentResource } from "./contract.js";

/** A cold process-lifetime capability; operations retain their own native scopes. */
export const VersionedContentRuntimeResource = defineRuntimeResource<
  "versioned-content",
  VersionedContentResource<never>
>({
  id: "versioned-content",
  title: "Versioned content",
  purpose: "Bounded remote Git content operations",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
