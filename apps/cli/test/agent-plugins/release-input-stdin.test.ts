import { MAX_RELEASE_INPUT_ENVELOPE_BYTES } from "@rawr/agent-plugin-lifecycle/release";
import { describe, expect, it } from "vitest";

import {
  readReleaseInputRecordStdin,
} from "../../src/commands/agent/plugins/check";

describe("release-input record stdin boundary", () => {
  it("refuses terminal input before reading a chunk", async () => {
    let reads = 0;
    const result = await readReleaseInputRecordStdin({
      isTTY: true,
      chunks: (async function* () {
        reads += 1;
        yield new Uint8Array([123, 125]);
      })(),
    });

    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("terminal stdin") });
    expect(reads).toBe(0);
  });

  it("admits the exact protocol ceiling across chunks", async () => {
    const result = await readReleaseInputRecordStdin({
      isTTY: false,
      chunks: chunks(
        new Uint8Array(MAX_RELEASE_INPUT_ENVELOPE_BYTES - 1),
        new Uint8Array(1),
      ),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.bytes.byteLength).toBe(MAX_RELEASE_INPUT_ENVELOPE_BYTES);
  });

  it("refuses the first byte beyond the protocol ceiling across chunks", async () => {
    const result = await readReleaseInputRecordStdin({
      isTTY: false,
      chunks: chunks(
        new Uint8Array(MAX_RELEASE_INPUT_ENVELOPE_BYTES),
        new Uint8Array(1),
      ),
    });

    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("stdin exceeds") });
  });
});

async function* chunks(...values: readonly Uint8Array[]): AsyncIterable<unknown> {
  yield* values;
}
