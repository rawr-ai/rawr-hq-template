import { defineEntrypoint, startApp } from "@habitat-ai/sdk/app";
import { createInngestHarness } from "@habitat-ai/sdk/runtime/harnesses/inngest";
import { app } from "./isolation.app.js";
import { processes } from "./runtime/processes.js";
import { asyncProfile } from "./runtime/profiles/local.js";
import { sources } from "./runtime/sources.js";
import { config, exposeChild, observeHarness } from "./src/control.js";
import { InngestResource } from "./src/resources.js";

if (config.role !== "async")
  throw new TypeError("The async entrypoint requires async configuration.");
const entrypoint = defineEntrypoint({
  id: "async",
  app,
  process: processes.async,
  profile: asyncProfile,
  identity: {
    app: app.id,
    process: processes.async.id,
    entrypoint: "async",
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
        surface: "async/workflow",
        harness: observeHarness(
          createInngestHarness({
            id: "isolation-async",
            mode: "serve",
            hostname: "127.0.0.1",
            port: config.port,
            path: "/api/inngest",
            client: InngestResource,
          })
        ),
      },
    ],
  }),
  `http://127.0.0.1:${config.port}/api/inngest`
);
