import { describe, expect, test } from "vitest";
import { startRuntimeBootgraph } from "../src";

describe("@rawr/core-runtime-bootgraph", () => {
  test("starts dependencies first and finalizes in reverse order", async () => {
    const events: string[] = [];
    const bootgraph = await startRuntimeBootgraph([
      {
        id: "server",
        dependsOn: ["providers"],
        start() {
          events.push("start:server");
          return { finalize: () => events.push("stop:server") };
        },
      },
      {
        id: "providers",
        start() {
          events.push("start:providers");
          return { finalize: () => events.push("stop:providers") };
        },
      },
    ]);

    expect(bootgraph.startedModuleIds).toEqual(["providers", "server"]);
    await bootgraph.stop();
    await bootgraph.stop();
    expect(events).toEqual([
      "start:providers",
      "start:server",
      "stop:server",
      "stop:providers",
    ]);
  });

  test("diagnoses missing dependencies before startup", async () => {
    const bootgraph = await startRuntimeBootgraph([
      {
        id: "server",
        dependsOn: ["providers"],
        start() {
          throw new Error("must not start");
        },
      },
    ]);

    expect(bootgraph.startedModuleIds).toEqual([]);
    expect(bootgraph.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.bootgraph.missing-dependency",
    );
  });

  test("diagnoses cycles before startup", async () => {
    const bootgraph = await startRuntimeBootgraph([
      {
        id: "server",
        dependsOn: ["providers"],
        start() {
          throw new Error("must not start");
        },
      },
      {
        id: "providers",
        dependsOn: ["server"],
        start() {
          throw new Error("must not start");
        },
      },
    ]);

    expect(bootgraph.startedModuleIds).toEqual([]);
    expect(bootgraph.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.bootgraph.cycle",
    );
  });

  test("rolls back started modules when later startup fails", async () => {
    const events: string[] = [];
    const bootgraph = await startRuntimeBootgraph([
      {
        id: "providers",
        start() {
          events.push("start:providers");
          return { finalize: () => events.push("stop:providers") };
        },
      },
      {
        id: "server",
        dependsOn: ["providers"],
        start() {
          throw new Error("server failed");
        },
      },
    ]);

    expect(bootgraph.startedModuleIds).toEqual([]);
    expect(bootgraph.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.bootgraph.start-failed",
    );
    expect(events).toEqual(["start:providers", "stop:providers"]);

    await bootgraph.stop();
    expect(events).toEqual(["start:providers", "stop:providers"]);
  });
});
