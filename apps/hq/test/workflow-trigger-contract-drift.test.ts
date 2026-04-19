import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq workflow publication selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps workflow publication empty once the false-future lane is archived", () => {
    expect(Object.keys(manifest.plugins.workflows)).toEqual([]);
  });
});
