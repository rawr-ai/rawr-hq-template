import { closeSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { defineRuntimeResource, requireResource } from "@habitat-ai/sdk/runtime/resources";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Effect } from "effect";
import { Inngest } from "inngest";
import { Type } from "typebox";
import { type FileLease, state } from "./control.js";

export const FileResource = defineRuntimeResource<"isolation.file", FileLease>({
  id: "isolation.file",
  title: "Child file lease",
  purpose: "One real file descriptor per process incarnation",
});
export const InngestResource = defineRuntimeResource<"isolation.inngest", Inngest>({
  id: "isolation.inngest",
  title: "Native Inngest client",
  purpose: "The exact acquired native registration client",
});
export const fileRequirement = requireResource({
  resource: FileResource,
  reason: "Selected operation file lease",
});
export const clientRequirement = requireResource({
  resource: InngestResource,
  reason: "Selected native async host",
});

export const fileProvider = defineRuntimeProvider({
  id: "isolation.file-provider",
  title: "Child file provider",
  provides: FileResource,
  requires: [],
  configSchema: RuntimeSchema.fromTypeBox(
    Type.Object({ root: Type.String(), role: Type.String(), incarnation: Type.String() })
  ),
  build({ config }) {
    state.counters.leaseBuild++;
    return providerFx.acquireRelease({
      acquire: Effect.sync(() => {
        const token = `${config.role}:${process.pid}:${config.incarnation}:${crypto.randomUUID()}`;
        const path = join(config.root, `lease-${process.pid}-${config.role}`);
        const fd = openSync(path, "wx+");
        try {
          writeFileSync(fd, token);
        } catch (error) {
          closeSync(fd);
          unlinkSync(path);
          throw error;
        }
        const lease = Object.freeze({ token, pid: process.pid, path, fd });
        state.lease = lease;
        state.leaseOpen = true;
        state.counters.leaseAcquire++;
        state.events.push("lease-acquired");
        return lease;
      }),
      release: (lease) =>
        Effect.sync(() => {
          closeSync(lease.fd);
          state.leaseOpen = false;
          unlinkSync(lease.path);
          state.counters.leaseRelease++;
          state.events.push("lease-released");
        }),
    });
  },
});

export const clientProvider = defineRuntimeProvider({
  id: "isolation.inngest-provider",
  title: "Native client with required backing file",
  provides: InngestResource,
  requires: [fileRequirement],
  configSchema: RuntimeSchema.fromTypeBox(
    Type.Object({ devServerUrl: Type.String(), requiredResourcePath: Type.String() })
  ),
  build({ config, resources }) {
    state.counters.clientBuild++;
    const lease = resources.get(fileRequirement);
    let backingFd: number | undefined;
    return providerFx.acquireRelease({
      acquire: Effect.sync(() => {
        if (lease !== state.lease) throw new Error("Native client requires its own process lease.");
        // A genuinely absent required file fails acquisition after the dependency acquired.
        const fd = openSync(config.requiredResourcePath, "r");
        try {
          const client = new Inngest({
            id: "process-isolation-async",
            isDev: true,
            baseUrl: config.devServerUrl,
          });
          backingFd = fd;
          state.counters.clientAcquire++;
          state.events.push("client-acquired");
          return client;
        } catch (error) {
          closeSync(fd);
          throw error;
        }
      }),
      release: () =>
        Effect.sync(() => {
          if (backingFd === undefined)
            throw new Error("Native client lost its backing file lease.");
          closeSync(backingFd);
          state.counters.clientRelease++;
          state.events.push("client-released");
        }),
    });
  },
});
