import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { SourceInventoryResource } from "./contract.js";
export const SourceInventoryRuntimeResource = defineRuntimeResource<
  "source-inventory",
  SourceInventoryResource<never>
>({
  id: "source-inventory",
  title: "Source inventory",
  purpose: "Observe bounded Git-visible source paths",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
