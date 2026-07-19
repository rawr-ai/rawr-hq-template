import type { ProviderDeploymentRequest } from "../../../src/service/modules/providers/model/dto/mode";
import type { VerifiedReleaseReader } from "../../../src/service/modules/providers/model/repositories/artifact";
import type { CanonicalNativeRuntime } from "../../../src/service/modules/providers/model/repositories/canonical-native";
import type { CurrentMainSelectionReader } from "../../../src/service/modules/providers/model/repositories/current-main";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetReceiptReader,
} from "../../../src/service/modules/providers/model/repositories/state";
import type { CanonicalStatusDependencies } from "../../../src/service/modules/providers/router/canonical-status.router";
import type { CanonicalSyncDependencies } from "../../../src/service/modules/providers/router/canonical-sync.router";

declare const currentMain: CurrentMainSelectionReader;
declare const releases: VerifiedReleaseReader;
declare const canonicalNative: CanonicalNativeRuntime;
declare const receipts: TargetReceiptReader;
declare const projectionMaterializer: ProviderProjectionMaterializer;
declare const marketplaceMaterializer: ProviderMarketplaceMaterializer;

const statusDependencies: CanonicalStatusDependencies = {
  currentMain,
  releases,
  native: canonicalNative,
};
void statusDependencies;

const statusCannotReceiveReceipt = {
  currentMain,
  releases,
  native: canonicalNative,
  // @ts-expect-error canonical status has no receipt port
  receipts,
} satisfies CanonicalStatusDependencies;
void statusCannotReceiveReceipt;

const syncCannotReceiveReceipt = {
  currentMain,
  releases,
  native: canonicalNative,
  projectionMaterializer,
  marketplaceMaterializer,
  // @ts-expect-error canonical sync has no receipt port
  receipts,
} satisfies CanonicalSyncDependencies;
void syncCannotReceiveReceipt;

export function exactModeNarrowing(request: ProviderDeploymentRequest): string {
  switch (request.kind) {
    case "targeted-test":
      return request.releases[0]?.releaseDigest ?? request.requestDigest;
    case "complete-test":
      return request.releaseSet.releaseSetDigest;
    case "canonical-sync":
      return request.channel;
  }
}
