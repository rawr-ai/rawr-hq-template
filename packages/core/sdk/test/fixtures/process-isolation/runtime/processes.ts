import { defineProcessCatalog } from "@habitat-ai/sdk/app";

export const processes = defineProcessCatalog({
  server: { id: "server", roles: ["server"] },
  async: { id: "async", roles: ["async"] },
});
