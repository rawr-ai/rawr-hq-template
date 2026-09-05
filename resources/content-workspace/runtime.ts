import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { ContentWorkspaceResource } from "./contract.js";

/** A cold process-lifetime capability; operations retain their own native scopes. */
export const ContentWorkspaceRuntimeResource = defineRuntimeResource<
  "content-workspace",
  ContentWorkspaceResource<never>
>({
  id: "content-workspace",
  title: "Content workspace",
  purpose: "Bounded local Git and workspace operations",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
