import { afterEach, describe, expect, it, vi } from "vitest";
import { writeJsonResult } from "../../src/lib/output";

afterEach(() => vi.restoreAllMocks());

describe("Habitat command JSON output", () => {
  it("completes when a downstream pipe closes with EPIPE", async () => {
    const error = Object.assign(new Error("broken pipe"), { code: "EPIPE" });
    const write = failStdoutWrite(error);

    await expect(writeJsonResult({ sentinel: "unread" })).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledOnce();
  });

  it("rejects stdout write failures other than EPIPE", async () => {
    const error = Object.assign(new Error("input/output error"), { code: "EIO" });
    const write = failStdoutWrite(error);

    await expect(writeJsonResult({ sentinel: "unwritten" })).rejects.toBe(error);
    expect(write).toHaveBeenCalledOnce();
  });
});

function failStdoutWrite(error: Error) {
  return vi.spyOn(process.stdout, "write").mockImplementation(((
    _chunk: string | Uint8Array,
    callback?: (error?: Error | null) => void
  ) => {
    callback?.(error);
    return false;
  }) as typeof process.stdout.write);
}
