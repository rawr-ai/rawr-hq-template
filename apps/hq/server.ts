import { startApp } from "@rawr/sdk/app";
import { createRawrHqApp, createRawrHqManifest, rawrHqRuntimeProfile, type RawrHqManifest } from "./rawr.hq";

export const rawrHqServerProcessShape = ["server"] as const;

export type RawrHqServerEntrypointSelection = Readonly<{
  manifest: RawrHqManifest;
  role: "server";
  status: "selected";
  entrypointId: string;
  processId: string;
}>;

export async function bootstrapRawrHqServer(): Promise<RawrHqServerEntrypointSelection> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.server.bootstrap",
    profile: rawrHqRuntimeProfile,
    roles: ["server"],
    processId: "hq.server",
    start: (context): RawrHqServerEntrypointSelection => ({
      manifest,
      role: "server",
      status: "selected",
      entrypointId: context.entrypointId,
      processId: context.processId ?? "hq.server",
    }),
  });
  if (!started.value) throw new Error("hq server bootstrap was not selected");
  return started.value;
}

export async function startRawrHqServer(): Promise<RawrHqServerEntrypointSelection> {
  const manifest = createRawrHqManifest();
  const started = await startApp(createRawrHqApp(), {
    entrypointId: "hq.server",
    profile: rawrHqRuntimeProfile,
    roles: ["server"],
    processId: "hq.server",
    start: (context): RawrHqServerEntrypointSelection => ({
      manifest,
      role: "server",
      status: "selected",
      entrypointId: context.entrypointId,
      processId: context.processId ?? "hq.server",
    }),
  });
  if (!started.value) throw new Error("hq server was not selected");
  return started.value;
}

if (import.meta.main) {
  const server = await startRawrHqServer();
  console.log(`@rawr/hq-app selected ${server.role} role through runtime app start`);
}
