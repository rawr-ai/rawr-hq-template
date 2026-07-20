export type {
  ClaudeNativeResourceSession,
  CodexNativeResourceSession,
  NativeProviderExecutablePaths,
  NativeProviderResourcePort,
  NativeResourceCapabilityProbe,
  NativeResourceJsonObservation,
  NativeResourceMarketplaceReadInput,
  NativeResourcePackageEntry,
  NativeResourcePackageObservation,
  NativeResourcePackageReadLimits,
  NativeResourcePluginReadInput,
  NativeResourceSessionInput,
} from "../../service/model/dependencies/providers";
export {
  NativeProviderResourceFailure,
  type NativeProviderResourceFailureKind,
} from "../../service/modules/providers/model/errors/native-resource";
export type {
  CompleteTargetIdentityReader,
} from "../../service/modules/providers/model/repositories/state";
export {
  createResourceCompleteTargetIdentityReader,
} from "../../service/modules/providers/repository/resource-record-storage";
