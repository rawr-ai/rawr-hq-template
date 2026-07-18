export type * from "../service/modules/releases/ports";
export type * from "../service/shared/release";

export {
  createResourceArtifactReader,
  createResourceArtifactStore,
  type ResourceArtifactRepositoryOptions,
} from "./releases/artifact-repository";
export {
  createResourceContentWorkspaceSnapshotReader,
  type ResourceContentWorkspaceSnapshotReadPort,
} from "./releases/content-workspace";
export {
  createResourceMechanicalEvidenceReader,
  createResourceMechanicalEvidenceStore,
  type ResourceMechanicalEvidenceRepositoryOptions,
} from "./releases/mechanical-evidence";
export {
  MAX_MECHANICAL_EVIDENCE_BYTES,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  MECHANICAL_EVIDENCE_PROTOCOL_VERSION,
  addReleaseSetPayloadBytes,
  compareCanonicalText,
  contentDigest,
  createAgentPluginPayload,
  createCompleteSetArtifactRef,
  createMechanicalEvidenceHandle,
  createReleaseArtifactRef,
  decodeAgentPluginReleaseInput,
  mechanicalEvidenceDigest,
  parseArtifactDigest,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseMechanicalEvidenceHandle,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseRelativePath,
  parseReleaseSetDigest,
  parseRepositoryIdentity,
} from "../service/shared/release";
