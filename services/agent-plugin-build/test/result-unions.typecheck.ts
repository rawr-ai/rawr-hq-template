import type {
  ArtifactRef,
  PluginId,
  ReleaseArtifactRef,
} from "@rawr/agent-plugin-release";

import type { BuildResult } from "../src/application";

declare const pluginId: PluginId;
declare const artifactRef: ArtifactRef;
declare const releaseRef: ReleaseArtifactRef;

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
