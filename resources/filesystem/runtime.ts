import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { FilesystemResource } from "./contract.js";
export const FilesystemRuntimeResource = defineRuntimeResource<"filesystem", FilesystemResource>({
  id: "filesystem",
  title: "Filesystem",
  purpose: "Ready native filesystem and path capabilities",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
