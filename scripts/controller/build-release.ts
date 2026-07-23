import { chmod, lstat, writeFile } from "node:fs/promises";

import {
  CONTROLLER_PAYLOAD_SCHEMA_VERSION,
  canonicalSerializeControllerReleaseEnvelope,
  createControllerPayloadManifest,
  createControllerReleaseEnvelope,
  computeControllerMemberPayloadDigest,
  sha256,
  type ControllerBuildInterfaceInput,
  type ControllerIssue,
  type ControllerOfficialMemberInput,
  type ControllerPlatform,
  type ControllerArchitecture,
  type ControllerPayloadEntryInput,
} from "@rawr/controller-release";

// The shipped inspector is the sole filesystem-to-product verification adapter.
import { requireVerifiedControllerRelease } from "../../apps/cli/src/lib/controller/release-inspector.ts";
import { sha256File } from "./lib/filesystem.ts";
import {
  CONTROLLER_DEPENDENCY_LOCK_PATH,
  CONTROLLER_ENVELOPE_PATH,
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_LICENSE_PATH,
  CONTROLLER_RUNTIME_PATH,
} from "./layout.ts";
import {
  materializeControllerRelease,
  type ControllerMaterializationResult,
  type ControllerPayloadSource,
} from "./materialize.ts";
import { resolveControllerNxClosure } from "./nx-closure.ts";

export type ControllerReleaseBuildInput = Readonly<{
  dataRoot: string;
  workspaceRoot: string;
  allowedSourceRoots: readonly string[];
  sourceRevision: string;
  dependencyLockPath: string;
  runtime: Readonly<{
    version: string;
    revision: string;
    platform: ControllerPlatform;
    architecture: ControllerArchitecture;
  }>;
  officialMembers: readonly Omit<ControllerOfficialMemberInput, "payloadDigest">[];
  buildInterfaces: readonly ControllerBuildInterfaceInput[];
  nxGraph: unknown;
  nxRootProjectNames: readonly string[];
  sources: readonly ControllerPayloadSource[];
}>;

function describeIssues(issues: readonly ControllerIssue[]): string {
  return issues.map((entry) => `${entry.path}: ${entry.message}`).join("; ");
}

async function observePlannedEntries(
  sources: readonly ControllerPayloadSource[]
): Promise<readonly ControllerPayloadEntryInput[]> {
  const entries: ControllerPayloadEntryInput[] = [];
  for (const source of sources) {
    if (source.kind === "file") {
      const status = await lstat(source.sourcePath);
      if (!status.isFile()) {
        throw new Error(`controller payload source must be a regular file: ${source.sourcePath}`);
      }
      entries.push({
        kind: "file",
        path: source.releasePath,
        mode: source.mode ?? status.mode & 0o777,
        digest: await sha256File(source.sourcePath),
      });
    } else {
      entries.push({
        kind: "link",
        path: source.releasePath,
        mode: 0o777,
        target: source.target,
      });
    }
  }
  return Object.freeze(entries);
}

export async function buildControllerRelease(
  input: ControllerReleaseBuildInput
): Promise<ControllerMaterializationResult> {
  const dependencyLockDigest = await sha256File(input.dependencyLockPath);
  const sources: readonly ControllerPayloadSource[] = Object.freeze([
    ...input.sources,
    Object.freeze({
      kind: "file" as const,
      sourcePath: input.dependencyLockPath,
      releasePath: CONTROLLER_DEPENDENCY_LOCK_PATH,
      mode: 0o644,
    }),
  ]);
  const entries = await observePlannedEntries(sources);
  const runtimeEntry = entries.find(
    (entry) => entry.kind === "file" && entry.path === CONTROLLER_RUNTIME_PATH
  );
  if (runtimeEntry === undefined || runtimeEntry.kind !== "file") {
    throw new Error(`controller payload is missing bundled runtime: ${CONTROLLER_RUNTIME_PATH}`);
  }
  const officialMembers = input.officialMembers.map((member) => {
    const payloadDigest = computeControllerMemberPayloadDigest(entries, member.root);
    if (!payloadDigest.ok) {
      throw new Error(
        `invalid official member payload ${member.packageId}: ${describeIssues(payloadDigest.issues)}`
      );
    }
    return Object.freeze({ ...member, payloadDigest: payloadDigest.value });
  });
  const nxClosure = resolveControllerNxClosure({
    graph: input.nxGraph,
    rootProjectNames: input.nxRootProjectNames,
  });
  const nxClosureDigest = sha256(
    JSON.stringify(nxClosure.map((project) => [project.name, project.root]))
  );
  const manifest = createControllerPayloadManifest({
    schemaVersion: CONTROLLER_PAYLOAD_SCHEMA_VERSION,
    sourceRevision: input.sourceRevision,
    runtime: {
      path: CONTROLLER_RUNTIME_PATH,
      licensePath: CONTROLLER_RUNTIME_LICENSE_PATH,
      digest: runtimeEntry.digest,
      version: input.runtime.version,
      revision: input.runtime.revision,
      platform: input.runtime.platform,
      architecture: input.runtime.architecture,
    },
    entrypoint: CONTROLLER_ENTRY_PATH,
    officialMembers,
    dependencyLock: {
      path: CONTROLLER_DEPENDENCY_LOCK_PATH,
      digest: dependencyLockDigest,
    },
    buildInterfaces: [
      ...input.buildInterfaces,
      { name: "nx-project-closure", version: nxClosureDigest },
    ],
    entries,
  });
  if (!manifest.ok) {
    throw new Error(`invalid controller release manifest: ${describeIssues(manifest.issues)}`);
  }
  const envelope = createControllerReleaseEnvelope(manifest.value);
  const envelopeBytes = canonicalSerializeControllerReleaseEnvelope(envelope);

  return await materializeControllerRelease({
    dataRoot: input.dataRoot,
    workspaceRoot: input.workspaceRoot,
    allowedSourceRoots: input.allowedSourceRoots,
    plan: {
      controllerDigest: envelope.controllerDigest,
      sources,
    },
    finalizer: {
      async writeEnvelope(stagingRoot) {
        const path = `${stagingRoot}/${CONTROLLER_ENVELOPE_PATH}`;
        await writeFile(path, envelopeBytes);
        await chmod(path, 0o644);
      },
      async verifyRelease(releaseRoot, expectedDigest) {
        await requireVerifiedControllerRelease({
          releaseRoot,
          expectedDigest,
          requireDigestDirectory: false,
        });
      },
    },
  });
}
