import { describe, expect, it } from "vitest";

import { createAgentPluginPayload } from "../../src/service/model/policy/agent-plugin-payload";
import {
  addReleaseSetPayloadBytes,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  totalReleaseSetPayloadBytes,
} from "../../src/service/model/policy/release-payload-accounting";

describe("release-set decoded payload accounting", () => {
  it("totals decoded bytes across every member payload manifest", () => {
    const first = createAgentPluginPayload([
      { path: "first.txt", mode: 0o644, bytes: new Uint8Array(2) },
    ]);
    const second = createAgentPluginPayload([
      { path: "second.txt", mode: 0o644, bytes: new Uint8Array(3) },
    ]);
    if (!first.ok || !second.ok) throw new Error("Expected valid accounting fixtures");

    expect(
      totalReleaseSetPayloadBytes([{ payload: first.value }, { payload: second.value }])
    ).toEqual({ ok: true, value: 5 });
  });

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
    expect(addReleaseSetPayloadBytes(0, -1)).toEqual({ ok: false });
    expect(addReleaseSetPayloadBytes(0, 0.5)).toEqual({ ok: false });
    expect(addReleaseSetPayloadBytes(MAX_RELEASE_SET_PAYLOAD_BYTES + 1, 0)).toEqual({ ok: false });
  });
});
