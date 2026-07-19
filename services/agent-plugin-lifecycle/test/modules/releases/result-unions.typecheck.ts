import type {
  ArtifactRef,
  PluginId,
  ReleaseArtifactRef,
} from "../../../src/service/shared/release";
import type { Deps } from "../../../src/client";

import type { BuildResult } from "../../../src/service/modules/releases/model/dto/release-lifecycle";

declare const pluginId: PluginId;
declare const artifactRef: ArtifactRef;
declare const releaseRef: ReleaseArtifactRef;

type ReleaseRetention = NonNullable<Deps["releaseRetention"]>;

const retentionReaders: ReleaseRetention = {
  pins: { read: async () => undefined },
  inventory: { read: async () => undefined },
};
void retentionReaders;

// @ts-expect-error Retention is one atomic capability; pins cannot be supplied alone.
const partialRetention: ReleaseRetention = {
  pins: { read: async () => undefined },
};
void partialRetention;

const targeted = { kind: "targeted", pluginId } as const;
const completeSet = { kind: "complete-set" } as const;

const published: BuildResult = {
  kind: "Published",
  mode: targeted,
  ref: artifactRef,
  newlyPublished: [releaseRef],
  preExisting: [],
};
void published;

// @ts-expect-error An incomplete result can only describe a complete-set build.
const targetedIncomplete: BuildResult = {
  kind: "PublicationIncomplete",
  mode: targeted,
  newlyPublished: [],
  preExisting: [],
  requestedSetRefAbsent: true,
  issues: [{ kind: "ReleaseConstruction", detail: "fixture" }],
};
void targetedIncomplete;

const incompleteWithRef: BuildResult = {
  kind: "PublicationIncomplete",
  mode: completeSet,
  // @ts-expect-error Incomplete publication never exposes the requested set reference.
  ref: artifactRef,
  newlyPublished: [],
  preExisting: [],
  requestedSetRefAbsent: true,
  issues: [{ kind: "ReleaseConstruction", detail: "fixture" }],
};
void incompleteWithRef;

const contradictoryPublished: BuildResult = {
  kind: "Published",
  mode: completeSet,
  ref: artifactRef,
  newlyPublished: [],
  preExisting: [],
  // @ts-expect-error A settled publication cannot claim an unknown final commit.
  requestedFinalCommit: "Unknown",
};
void contradictoryPublished;
