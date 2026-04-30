import { startApp } from "@rawr/sdk/app";
import { createRawrHqApp, createRawrHqManifest, rawrHqRuntimeProfile, type RawrHqManifest } from "./rawr.hq";

export const rawrHqDevProcessShape = ["server", "async"] as const;

export type RawrHqDevEntrypointSelection = Readonly<{
  manifest: RawrHqManifest;
  roles: readonly ["server", "async"];
  status: "selected";
  entrypointId: string;
  processId: string;
}>;

export async function bootstrapRawrHqDev(): Promise<RawrHqDevEntrypointSelection> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.dev.bootstrap",
    profile: rawrHqRuntimeProfile,
    roles: ["server", "async"],
    processId: "hq.dev",
    start: (context): RawrHqDevEntrypointSelection => ({
      manifest,
      roles: ["server", "async"],
      status: "selected",
      entrypointId: context.entrypointId,
      processId: context.processId ?? "hq.dev",
    }),
  });
  if (!started.value) throw new Error("hq dev bootstrap was not selected");
  return started.value;
}

export async function startRawrHqDev(): Promise<RawrHqDevEntrypointSelection> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.dev",
    profile: rawrHqRuntimeProfile,
    roles: ["server", "async"],
    processId: "hq.dev",
    start: (context): RawrHqDevEntrypointSelection => ({
      manifest,
      roles: ["server", "async"],
      status: "selected",
      entrypointId: context.entrypointId,
      processId: context.processId ?? "hq.dev",
    }),
  });
  if (!started.value) throw new Error("hq dev was not selected");
  return started.value;
}

if (import.meta.main) {
  const dev = await startRawrHqDev();
  console.log(`@rawr/hq-app selected ${dev.roles.join("+")} roles through runtime app start`);
}
