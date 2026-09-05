import { defineProcessCatalog } from "@habitat-ai/sdk/app";

export const processes = defineProcessCatalog({
  cli: { id: "cli", roles: ["cli"], harness: "habitat.oclif" },
});
