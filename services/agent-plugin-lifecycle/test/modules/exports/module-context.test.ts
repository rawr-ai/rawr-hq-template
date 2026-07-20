import { describe, expect, expectTypeOf, it } from "vitest";

import { selectArtifactReader } from "../../../src/service/modules/exports/model/helpers/artifact-reader";
import type { ArtifactStore } from "../../../src/service/model/dependencies/releases";
import type { ArtifactRef } from "../../../src/service/shared/release";
import { alphaOnlyArtifactFixture } from "./artifact-fixture";

describe("export module artifact context", () => {
  it("projects the service artifact store to its read-only capability", async () => {
    let received: ArtifactRef | undefined;
    const store = {
      owner: "service-artifact-store",
      async read(ref: ArtifactRef) {
        expect(this.owner).toBe("service-artifact-store");
        received = ref;
        return Object.freeze({ kind: "Missing" as const, ref });
      },
      async publishRelease() {
        throw new Error("publication is outside the export capability");
      },
      async publishReleaseSet() {
        throw new Error("publication is outside the export capability");
      },
    } satisfies ArtifactStore & Readonly<{ owner: string }>;
    const ref = alphaOnlyArtifactFixture().alpha.ref;

    const reader = selectArtifactReader(store);

    expect(Object.keys(reader)).toEqual(["read"]);
    expect(reader).not.toHaveProperty("publishRelease");
    expect(reader).not.toHaveProperty("publishReleaseSet");
    expect(reader.read).not.toBe(store.read);
    await expect(reader.read(ref)).resolves.toEqual({ kind: "Missing", ref });
    expect(received).toBe(ref);
    expectTypeOf<keyof typeof reader>().toEqualTypeOf<"read">();
  });
});
