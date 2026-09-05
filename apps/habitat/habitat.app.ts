import { createPlugin } from "@habitat-ai/plugin-foundation";
import { defineApp } from "@habitat-ai/sdk/app";

export const habitatApp = defineApp({ id: "habitat", plugins: [createPlugin()] });
