import { defineEntrypoint, startApp } from "@habitat-ai/sdk/app";
import { createElysiaHarness } from "@habitat-ai/sdk/runtime/harnesses/elysia";
import { app } from "./isolation.app.js";
import { processes } from "./runtime/processes.js";
import { serverProfile } from "./runtime/profiles/local.js";
import { sources } from "./runtime/sources.js";
import { config, exposeChild, observeHarness } from "./src/control.js";

if (config.role !== "server")
  throw new TypeError("The server entrypoint requires server configuration.");
const entrypoint = defineEntrypoint({
  id: "server",
  app,
  process: processes.server,
  profile: serverProfile,
  identity: {
    app: app.id,
    process: processes.server.id,
    entrypoint: "server",
    deployment: config.deployment,
    source: config.source,
  },
});
await exposeChild(
  entrypoint,
  startApp(entrypoint, {
    sources,
    finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
    integrations: [
      {
        surface: "server/api",
        harness: observeHarness(
          createElysiaHarness({
            id: "isolation-server",
            hostname: "127.0.0.1",
            port: config.port,
            publicDocument: {
              path: "/openapi.json",
              info: { title: "Process isolation", version: "1" },
            },
          })
        ),
      },
    ],
  }),
  `http://127.0.0.1:${config.port}/api/probe`
);
