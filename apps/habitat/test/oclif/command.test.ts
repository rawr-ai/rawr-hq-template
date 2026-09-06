import { type HabitatBaseFlags, HabitatCommand, type HabitatResult } from "@habitat-ai/cli/command";
import { Flags } from "@oclif/core";
import { afterEach, describe, expect, it, vi } from "vitest";

type ProbeResult = {
  flags: HabitatBaseFlags;
  result: HabitatResult<{ operation: string }>;
};

const outputLines: string[] = [];

class ContractProbe extends HabitatCommand {
  static flags = {
    ...HabitatCommand.baseFlags,
    "dry-run": Flags.boolean(),
    yes: Flags.boolean({ char: "y" }),
    fail: Flags.boolean(),
    human: Flags.boolean(),
  } as const;

  override log(message = "", ...args: unknown[]): void {
    outputLines.push([message, ...args].map(String).join(" "));
  }

  async run(): Promise<ProbeResult> {
    const { flags } = await this.parse(ContractProbe);
    const baseFlags = HabitatCommand.extractBaseFlags(flags);
    const result = flags.fail
      ? this.fail("operation rejected", {
          code: "REJECTED",
          details: { reason: "test" },
          meta: { phase: "admission" },
        })
      : this.ok({ operation: "check" }, { phase: "complete" }, ["test warning"]);

    await this.outputResult(result, {
      flags: baseFlags,
      ...(flags.human
        ? { human: (value) => this.log(value.ok ? "completed check" : value.error.message) }
        : {}),
    });
    return { flags: baseFlags, result };
  }
}

afterEach(() => {
  outputLines.length = 0;
  vi.restoreAllMocks();
});

describe("Habitat command contract", () => {
  it("advertises only JSON universally and rejects unowned mutation controls", async () => {
    class UniversalProbe extends HabitatCommand {
      async run() {
        return this.parse(UniversalProbe);
      }
    }
    expect(Object.keys(HabitatCommand.baseFlags)).toEqual(["json"]);
    for (const flag of ["--dry-run", "--yes", "-y"]) {
      await expect(UniversalProbe.run([flag])).rejects.toThrow();
    }
    expect(HabitatCommand.extractBaseFlags({ json: true })).toEqual({
      json: true,
      dryRun: false,
      yes: false,
    });
  });

  it("normalizes explicitly opted-in flags and writes the stable JSON envelope", async () => {
    const writes = captureStdoutWrites();
    const observed = await ContractProbe.run(["--json", "--dry-run", "-y"]);

    expect(observed.flags).toEqual({ json: true, dryRun: true, yes: true });
    expect(observed.result).toEqual({
      ok: true,
      data: { operation: "check" },
      meta: { phase: "complete" },
      warnings: ["test warning"],
    });
    expect(JSON.parse(writes.join(""))).toEqual(observed.result);
  });

  it("retains structured failures and gives JSON precedence over human output", async () => {
    const writes = captureStdoutWrites();
    const observed = await ContractProbe.run(["--fail", "--human", "--json"]);

    expect(observed.result).toEqual({
      ok: false,
      error: {
        message: "operation rejected",
        code: "REJECTED",
        details: { reason: "test" },
      },
      meta: { phase: "admission" },
    });
    expect(JSON.parse(writes.join(""))).toEqual(observed.result);
    expect(outputLines).toEqual([]);
  });

  it("uses selected human rendering and the default Oclif result output", async () => {
    await ContractProbe.run(["--human"]);
    await ContractProbe.run(["--fail"]);

    expect(outputLines).toEqual(["completed check", "error: operation rejected"]);
  });
});

function captureStdoutWrites(): string[] {
  const writes: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  }) as typeof process.stdout.write);
  return writes;
}
