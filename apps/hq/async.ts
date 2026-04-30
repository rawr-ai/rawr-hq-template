import { startApp } from "@rawr/sdk/app";
import { createRawrHqApp, createRawrHqManifest, rawrHqRuntimeProfile, type RawrHqManifest } from "./rawr.hq";

export const rawrHqAsyncProcessShape = ["async"] as const;

export type RawrHqAsyncEntrypointSelection = Readonly<{
  manifest: RawrHqManifest;
  role: "async";
  status: "selected";
  workflows: readonly string[];
  schedules: readonly string[];
  entrypointId: string;
  processId: string;
}>;

export async function startRawrHqAsync(): Promise<RawrHqAsyncEntrypointSelection> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.async",
    profile: rawrHqRuntimeProfile,
    roles: ["async"],
    processId: "hq.async",
    start: (context): RawrHqAsyncEntrypointSelection => ({
      manifest,
      role: "async",
      status: "selected",
      workflows: Object.keys(manifest.roles.async.workflows),
      schedules: Object.keys(manifest.roles.async.schedules),
      entrypointId: context.entrypointId,
      processId: context.processId ?? "hq.async",
    }),
  });
  if (!started.value) throw new Error("hq async role was not selected");
  return started.value;
}

if (import.meta.main) {
  await startRawrHqAsync();
}
