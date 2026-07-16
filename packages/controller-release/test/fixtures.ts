import {
  computeControllerMemberPayloadDigest,
  type ControllerObservedPayloadEntryInput,
  type ControllerPayloadEntryInput,
  type ControllerPayloadManifestInput,
} from "../src";

/*
 * These are content fixtures, not claimed controller/member identities.
 * Member digests below are always derived through the production codec.
 */
export const DIGEST_A = "a".repeat(64);
export const DIGEST_B = "b".repeat(64);
export const DIGEST_C = "c".repeat(64);
export const DIGEST_D = "d".repeat(64);
export const DIGEST_E = "e".repeat(64);

function memberDigest(entries: readonly ControllerPayloadEntryInput[], root: string): string {
  const result = computeControllerMemberPayloadDigest(entries, root);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

export function controllerManifestInput(): ControllerPayloadManifestInput {
  const entries = controllerPayloadEntries();
  return {
    schemaVersion: 1,
    sourceRevision: "1".repeat(40),
    runtime: {
      path: "runtime/bun",
      licensePath: "runtime/LICENSE.txt",
      digest: DIGEST_B,
      version: "1.3.14",
      revision: "0d9b296af33f2b851fcbf4df3e9ec89751734ba4",
      platform: "darwin",
      architecture: "arm64",
    },
    entrypoint: "app/rawr.mjs",
    officialMembers: [
      {
        packageId: "@rawr/cli",
        version: "1.0.0",
        role: "command",
        root: "app/cli",
        payloadDigest: memberDigest(entries, "app/cli"),
        commandIds: ["doctor:global", "plugins:list"],
        topics: ["doctor", "plugins"],
        aliases: ["plugins:ls"],
        hiddenAliases: [],
        hooks: ["init"],
      },
      {
        packageId: "@rawr/plugin-devops",
        version: "1.0.0",
        role: "command",
        root: "app/plugins/devops",
        payloadDigest: memberDigest(entries, "app/plugins/devops"),
        commandIds: ["dev"],
        topics: ["dev"],
        aliases: [],
        hiddenAliases: ["develop"],
        hooks: ["prerun"],
      },
    ],
    dependencyLock: {
      path: "meta/bun.lock",
      digest: DIGEST_C,
    },
    buildInterfaces: [
      { name: "bun", version: "1.3.14" },
      { name: "controller-release", version: "1" },
    ],
    entries,
  };
}

export function controllerPayloadEntries(): ControllerPayloadEntryInput[] {
  return [
    { kind: "file", path: "app/rawr.mjs", mode: 0o755, digest: DIGEST_A },
    { kind: "file", path: "runtime/bun", mode: 0o755, digest: DIGEST_B },
    { kind: "file", path: "runtime/LICENSE.txt", mode: 0o644, digest: DIGEST_E },
    { kind: "file", path: "meta/bun.lock", mode: 0o644, digest: DIGEST_C },
    { kind: "file", path: "app/cli/index.mjs", mode: 0o644, digest: DIGEST_C },
    { kind: "file", path: "app/plugins/devops/index.mjs", mode: 0o644, digest: DIGEST_D },
    { kind: "file", path: "node_modules/shared/index.mjs", mode: 0o644, digest: DIGEST_E },
    { kind: "link", path: "app/cli/current.mjs", mode: 0o777, target: "app/cli/index.mjs" },
  ];
}

export function controllerObservedPayloadEntries(): ControllerObservedPayloadEntryInput[] {
  return controllerPayloadEntries().map((entry) => ({ ...entry, nlink: 1 }));
}
