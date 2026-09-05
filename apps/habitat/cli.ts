import { defineEntrypoint, type StartAppOptions, startApp } from "@habitat-ai/sdk/app";
import { habitatApp } from "./habitat.app.js";
import { processes } from "./runtime/processes.js";
import { localProfile } from "./runtime/profiles/local.js";
import { createOclifHost, type OclifSourceBundle } from "./src/host.js";

export const entrypoint = defineEntrypoint({
  id: "habitat.cli",
  app: habitatApp,
  profile: localProfile,
  process: processes.cli,
  identity: {
    app: habitatApp.id,
    process: processes.cli.id,
    entrypoint: "habitat.cli",
    deployment: "local",
    source: "habitat.cli",
  },
});

export function runHabitatProcess(input: {
  readonly appRoot: string;
  readonly sources: () => StartAppOptions["sources"];
  readonly sourceBundle: OclifSourceBundle;
  readonly args?: readonly string[];
  readonly development?: boolean;
  readonly terminal: boolean;
}) {
  const host = createOclifHost({
    harnessId: "habitat.oclif",
    root: input.appRoot,
    sourceBundle: input.sourceBundle,
    args: input.args,
    ...(input.development ? { discoveryModule: "./src/oclif.ts" } : {}),
  });
  const startup = () =>
    startApp(entrypoint, {
      sources: input.sources(),
      integrations: [host.integration],
      finalization: { policy: "waitForNativeStop", deadlineMs: 10_000 },
    });
  return input.terminal ? host.execute(startup) : host.run(startup);
}
