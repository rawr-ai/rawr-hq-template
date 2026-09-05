import { writeFileSync } from "node:fs";
import { type NativeIntegration, startApp } from "@habitat-ai/sdk/app";
import { createOclifHost } from "../../../dist/host.js";
import {
  appRoot,
  dataPath,
  entrypoint,
  record,
  sourceBundle,
  startupFailure,
  waitForStartupGate,
} from "./app.js";

const host = createOclifHost({
  harnessId: "native.oclif",
  root: appRoot,
  sourceBundle,
  args: process.argv.slice(2),
});
const integration = startupFailure
  ? {
      ...host.integration,
      harness: {
        ...host.integration.harness,
        async mount(input: Parameters<typeof host.integration.harness.mount>[0]) {
          const handle = await host.integration.harness.mount(input);
          record("native.mounted");
          return {
            ...handle,
            async stop() {
              record("native.stop");
              await handle.stop();
              record("native.stopped");
            },
          };
        },
      },
    }
  : host.integration;
const laterFailure: NativeIntegration = {
  surface: "cli/commands",
  harness: {
    id: "native.zz-after",
    roles: ["cli"],
    surfaces: ["cli/commands"],
    async mount() {
      await waitForStartupGate();
      record("startup.fail");
      throw new Error("STARTUP_MOUNT_FAILURE");
    },
  },
};
const startup = () => {
  record("startup");
  return startApp(entrypoint, {
    sources: { appRoot },
    integrations: [integration, ...(startupFailure ? [laterFailure] : [])],
    finalization: { policy: "waitForNativeStop", deadlineMs: 0 },
    observation: {
      sink: {
        publish(event) {
          if (event.name?.startsWith("oclif.")) record(event.name);
        },
      },
    },
  }).then((started) => {
    writeFileSync(
      dataPath("ready-catalog.json"),
      JSON.stringify({
        selectedExecutionIds: sourceBundle.entries.map(({ ref }) => ref.executionId),
        catalog: started.catalog(),
      })
    );
    return started;
  });
};
if (process.env.HABITAT_FIXTURE_ACQUIRE_GATE === "1") {
  process.on("SIGINT", () => record("signal.received"));
  process.on("SIGTERM", () => record("signal.received"));
}

const stdinCache = '{"message":"CACHED_NATIVE_STDIN"}';
const existingOclif: unknown = Reflect.get(globalThis, "oclif");
const nativeGlobals = Object.assign(globalThis, {
  oclif: {
    ...(typeof existingOclif === "object" && existingOclif !== null ? existingOclif : {}),
    stdinCache,
  },
});
// Native handle() can terminate synchronously; POSIX signal termination skips this receipt.
process.once("exit", () => {
  writeFileSync(
    dataPath("stdin-state.json"),
    JSON.stringify({
      cacheUnchanged: nativeGlobals.oclif.stdinCache === stdinCache,
    })
  );
});
if (process.env.HABITAT_FIXTURE_CAPTURE === "1") {
  const previousExitCode = process.exitCode;
  try {
    const result = await host.run(startup);
    if (process.exitCode !== previousExitCode)
      throw new Error("Capture changed native exit status.");
    record(`captured:${JSON.stringify(result)}`);
  } catch (error) {
    if (process.exitCode !== previousExitCode)
      throw new Error("Capture changed native exit status.");
    record(`rejected:${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  await host.execute(startup);
}
