import { afterEach, describe, expect, it, vi } from "vitest";

import { productFixture } from "../support/service/release-fixtures";

const accountingModule = "../../src/service/model/policy/release-payload-accounting";
const releaseSetModule = "../../src/service/model/policy/agent-plugin-release-set";

afterEach(() => {
  vi.doUnmock(accountingModule);
  vi.resetModules();
});

describe("release-set aggregate accounting wiring", () => {
  it("guards construction and complete verification at their public diagnostic paths", async () => {
    const fixture = productFixture();
    const totalReleaseSetPayloadBytes = vi.fn(() => ({ ok: false as const }));

    vi.resetModules();
    vi.doMock(accountingModule, async () => ({
      ...(await vi.importActual<
        typeof import("../../src/service/model/policy/release-payload-accounting")
      >(accountingModule)),
      totalReleaseSetPayloadBytes,
    }));
    const { createAgentPluginReleaseSet, verifyCompleteReleaseSet } = await import(
      releaseSetModule
    );

    const construction = createAgentPluginReleaseSet({
      releaseInput: fixture.releaseInput,
      releases: [fixture.alphaRelease, fixture.betaRelease],
    });
    const verification = verifyCompleteReleaseSet(fixture.releaseSet, [
      fixture.alphaRelease,
      fixture.betaRelease,
    ]);

    expect(construction.ok).toBe(false);
    if (!construction.ok) {
      expect(construction.issues).toContainEqual(
        expect.objectContaining({
          code: "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          path: "releaseSet.releases",
        })
      );
    }
    expect(verification.ok).toBe(false);
    if (!verification.ok) {
      expect(verification.issues).toContainEqual(
        expect.objectContaining({ code: "PAYLOAD_BYTES_LIMIT_EXCEEDED", path: "releases" })
      );
    }
    expect(totalReleaseSetPayloadBytes).toHaveBeenCalledTimes(2);
    expect(totalReleaseSetPayloadBytes).toHaveBeenNthCalledWith(1, [
      fixture.alphaRelease,
      fixture.betaRelease,
    ]);
    expect(totalReleaseSetPayloadBytes).toHaveBeenNthCalledWith(2, [
      fixture.alphaRelease,
      fixture.betaRelease,
    ]);
  });
});
