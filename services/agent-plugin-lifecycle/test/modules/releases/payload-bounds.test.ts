import { describe, expect, it } from "vitest";
import {
  addReleaseSetPayloadBytes,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
} from "../../../src/service/shared/release";

describe("release-set decoded payload accounting", () => {
  it("admits the exact aggregate boundary and rejects one byte over", () => {
    const below = addReleaseSetPayloadBytes(0, MAX_RELEASE_SET_PAYLOAD_BYTES - 1);
    expect(below).toEqual({ ok: true, value: MAX_RELEASE_SET_PAYLOAD_BYTES - 1 });
    if (!below.ok) return;
    expect(addReleaseSetPayloadBytes(below.value, 1)).toEqual({
      ok: true,
      value: MAX_RELEASE_SET_PAYLOAD_BYTES,
    });
    expect(addReleaseSetPayloadBytes(MAX_RELEASE_SET_PAYLOAD_BYTES, 1)).toEqual({ ok: false });
  });

  it("rejects unsafe, negative, and already-overbound totals", () => {
    expect(addReleaseSetPayloadBytes(Number.MAX_SAFE_INTEGER, 1)).toEqual({ ok: false });
    expect(addReleaseSetPayloadBytes(-1, 1)).toEqual({ ok: false });
    expect(addReleaseSetPayloadBytes(MAX_RELEASE_SET_PAYLOAD_BYTES + 1, 0)).toEqual({ ok: false });
  });
});
