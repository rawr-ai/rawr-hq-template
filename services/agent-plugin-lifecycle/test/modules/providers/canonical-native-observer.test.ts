import { describe, expect, it, vi } from "vitest";

import { createCanonicalNativeObserver } from "../../../src/service/modules/providers/repository/canonical-native-observer";
import type { NativeProviderInventoryBridge } from "../../../src/service/modules/providers/repository/native";
import { NativeProvenanceAmbiguity } from "../../../src/service/modules/providers/repository/resource-provenance";
import { parseContentAuthority } from "../../../src/service/shared/release";
import { parseProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import type { ProviderSourceIdentity } from "../../../src/service/modules/providers/model/policy/projection";

const TARGET = mustTarget();
const OWNER = mustContentAuthority("rawr-hq");

describe("canonical native observation", () => {
  it("reads native state once and preserves standalone exposure", async () => {
    const standalone = Object.freeze({
      exposureKind: "installed" as const,
      exposureIdentity: "local@personal",
      nativeIdentity: "rawr:local",
      providerSourceIdentity: "personal" as ProviderSourceIdentity,
      enablement: "enabled" as const,
      visibleSkills: Object.freeze(["local"]),
      visibleHooks: Object.freeze([]),
    });
    const inventory = vi.fn(async () => Object.freeze({
      marketplace: Object.freeze({ kind: "absent" as const }),
      members: Object.freeze([]),
      standaloneExposures: Object.freeze([standalone]),
    }));

    const observed = await createCanonicalNativeObserver({
      provider: "codex",
      contentAuthority: OWNER,
      bridge: bridge(inventory),
    }).observe(TARGET, OWNER);

    expect(observed).toEqual({
      ok: true,
      value: {
        kind: "observed",
        inventory: expect.objectContaining({
          target: TARGET,
          standaloneExposures: [standalone],
        }),
      },
    });
    expect(inventory).toHaveBeenCalledExactlyOnceWith(TARGET.home);
  });

  it.each([
    "managed-marketplace-metadata-invalid",
    "managed-plugin-provenance-invalid",
  ] as const)("preserves typed %s ambiguity", async (reason) => {
    const inventory = vi.fn(async () => {
      throw new NativeProvenanceAmbiguity(reason);
    });

    const observed = await createCanonicalNativeObserver({
      provider: "codex",
      contentAuthority: OWNER,
      bridge: bridge(inventory),
    }).observe(TARGET, OWNER);

    expect(observed).toEqual({
      ok: true,
      value: {
        kind: "ambiguous-provenance",
        target: TARGET,
        reason,
      },
    });
    expect(inventory).toHaveBeenCalledOnce();
  });

  it("preserves ordinary native inspection failure", async () => {
    const inventory = vi.fn(async () => {
      throw new Error("native provider unavailable");
    });

    const observed = await createCanonicalNativeObserver({
      provider: "codex",
      contentAuthority: OWNER,
      bridge: bridge(inventory),
    }).observe(TARGET, OWNER);

    expect(observed).toEqual({
      ok: false,
      issues: [expect.objectContaining({
        code: "VISIBILITY_FAILED",
        path: "target.inventory",
      })],
    });
    expect(inventory).toHaveBeenCalledOnce();
  });
});

function bridge(
  inventory: NativeProviderInventoryBridge["inventory"],
): NativeProviderInventoryBridge {
  return Object.freeze({ inventory });
}

function mustTarget() {
  const target = parseProviderTarget({
    provider: "codex",
    home: "/tmp/rawr-canonical-native-observer",
  });
  if (!target.ok) throw new Error(target.issues[0].message);
  return target.value;
}

function mustContentAuthority(value: string) {
  const authority = parseContentAuthority(value, "test.contentAuthority");
  if (!authority.ok) throw new Error(authority.issues[0].message);
  return authority.value;
}
