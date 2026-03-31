import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq workflow publication selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps workflow publication empty once the false-future lane is archived", () => {
    expect(Object.keys(manifest.roles.async.workflows)).toEqual([]);
  });
});
