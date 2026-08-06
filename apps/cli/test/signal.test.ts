import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { installRawrCliSignalHandlers, type RawrCliSignalHost } from "../src/signal";

class SignalHost extends EventEmitter {
  exitCode: number | undefined;

  emitSignal(signal: "SIGINT" | "SIGTERM"): void {
    this.emit(signal, signal);
  }
}

describe("Oclif signal ownership", () => {
  it.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)("selects the native %s status and shares one cancellation", async (signal, status) => {
    const host = new SignalHost();
    const shutdown = vi.fn(async () => undefined);
    const remove = installRawrCliSignalHandlers(shutdown, host as RawrCliSignalHost);

    host.emitSignal(signal);
    host.emitSignal(signal);
    await vi.waitFor(() => expect(shutdown).toHaveBeenCalledOnce());

    expect(host.exitCode).toBe(status);
    expect(shutdown).toHaveBeenCalledWith("cancelled");
    remove();
    remove();
    expect(host.listenerCount("SIGINT")).toBe(0);
    expect(host.listenerCount("SIGTERM")).toBe(0);
  });

  it("preserves a product-derived exit status and contains shutdown failure", async () => {
    const host = new SignalHost();
    host.exitCode = 7;
    const shutdown = vi.fn(async () => {
      throw new Error("telemetry shutdown failed");
    });
    const remove = installRawrCliSignalHandlers(shutdown, host as RawrCliSignalHost);

    host.emitSignal("SIGINT");
    await vi.waitFor(() => expect(shutdown).toHaveBeenCalledOnce());

    expect(host.exitCode).toBe(7);
    remove();
  });
});
