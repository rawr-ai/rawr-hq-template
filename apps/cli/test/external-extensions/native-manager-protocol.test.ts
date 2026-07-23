import { realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  decodeNativeManagerInvocation,
  encodeNativeManagerInvocation,
  NATIVE_MANAGER_PROTOCOL_VERSION,
  sha256RegularFile,
  verifyInspectedInstallArtifact,
} from "../../src/lib/external-extensions/native-manager-protocol";
import { GUARDED_NATIVE_MANAGER_CONTRACT } from "../../src/lib/external-extensions/native-mutation";
import { removeFixtureRoots, tempRoot } from "./fixtures";

afterEach(removeFixtureRoots);

describe("native manager request protocol", () => {
  it("round-trips only an allowlisted command with the exact guarded contract", () => {
    const invocation = {
      protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
      cliRoot: "/controller/release/app",
      nativeDataDir: "/native/data",
      request: {
        commandExport: "plugins:reset" as const,
        argv: ["--hard"],
        contract: GUARDED_NATIVE_MANAGER_CONTRACT,
      },
    } as const;

    expect(decodeNativeManagerInvocation(encodeNativeManagerInvocation(invocation))).toEqual(
      invocation
    );
  });

  it("rejects commands and contract fields outside the closed protocol", () => {
    const base = {
      protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
      cliRoot: "/controller/release/app",
      nativeDataDir: "/native/data",
      request: {
        commandExport: "plugins:inspect",
        argv: [],
        contract: GUARDED_NATIVE_MANAGER_CONTRACT,
      },
    };
    expect(() => decodeNativeManagerInvocation(JSON.stringify(base))).toThrow(
      "NATIVE_MANAGER_COMMAND_REJECTED"
    );
    expect(() =>
      decodeNativeManagerInvocation(
        JSON.stringify({
          ...base,
          request: {
            commandExport: "plugins:update",
            argv: [],
            contract: { ...GUARDED_NATIVE_MANAGER_CONTRACT, autoInstall: true },
          },
        })
      )
    ).toThrow("NATIVE_MANAGER_CONTRACT_INVALID");
  });

  it("rehashes the exact bound install artifact before native dispatch", async () => {
    const requestedArtifact = path.join(tempRoot("manager-artifact"), "candidate.tgz");
    writeFileSync(requestedArtifact, "original");
    const artifact = realpathSync(requestedArtifact);
    const sha256 = await sha256RegularFile(artifact);
    const request = {
      commandExport: "plugins:install" as const,
      argv: [`file:${artifact}`, "--silent"],
      contract: GUARDED_NATIVE_MANAGER_CONTRACT,
      inspectedArtifact: { path: artifact, sha256 },
    };

    await expect(verifyInspectedInstallArtifact(request)).resolves.toBeUndefined();
    writeFileSync(artifact, "changed");
    await expect(verifyInspectedInstallArtifact(request)).rejects.toThrow(
      "NATIVE_MANAGER_ARTIFACT_HASH_MISMATCH"
    );
  });
});
