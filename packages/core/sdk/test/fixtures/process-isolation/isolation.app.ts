import { defineApp } from "@habitat-ai/sdk/app";
import { apiPlugin, workflowPlugin } from "./src/plugins.js";

export const app = defineApp({ id: "process-isolation", plugins: [apiPlugin, workflowPlugin] });
