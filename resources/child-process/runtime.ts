import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { ChildProcessResource } from "./contract.js";

export const ChildProcessRuntimeResource = defineRuntimeResource<
  "child-process",
  ChildProcessResource
>({
  id: "child-process",
  title: "Child process",
  purpose: "Native scoped child-process spawning and streams",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
