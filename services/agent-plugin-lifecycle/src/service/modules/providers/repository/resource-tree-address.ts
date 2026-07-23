import type { ArtifactObjectAddress } from "@rawr/resource-agent-plugin-artifact-repository";

import type { ImmutableProviderTreeKey } from "../model/repositories/projection-storage";

const MEMBER_TREE_NAMESPACE = Object.freeze(["members"] satisfies [string]);
const MARKETPLACE_TREE_NAMESPACE = Object.freeze(["marketplaces"] satisfies [string]);

/** One address law shared by provider projection publication and native lookup. */
export function providerTreeAddress(
  repositoryRoot: string,
  key: ImmutableProviderTreeKey
): ArtifactObjectAddress {
  return key.kind === "member"
    ? Object.freeze({
        repositoryRoot,
        namespace: MEMBER_TREE_NAMESPACE,
        objectId: key.memberFingerprint,
      })
    : Object.freeze({
        repositoryRoot,
        namespace: MARKETPLACE_TREE_NAMESPACE,
        objectId: key.projectionDigest,
      });
}

export function sameProviderTreeAddress(
  left: ArtifactObjectAddress,
  right: ArtifactObjectAddress
): boolean {
  return (
    left.repositoryRoot === right.repositoryRoot &&
    left.objectId === right.objectId &&
    left.namespace.length === right.namespace.length &&
    left.namespace.every((segment, index) => segment === right.namespace[index])
  );
}
