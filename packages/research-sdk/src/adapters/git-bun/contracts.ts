import { type Static, Type } from "typebox";
import { MaximumTimerDelayMs } from "../../contracts/config.js";
import { DigestIdentitySchema, NonEmptyStringSchema } from "../../contracts/identity.js";
import { closedObject } from "../../contracts/schema.js";

const GitObjectIdSchema = Type.String({
  pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$",
});

const ResolvedToolIdentitySchema = closedObject(
  {},
  {
    resolvedBinary: NonEmptyStringSchema,
    version: NonEmptyStringSchema,
    revision: Type.Optional(NonEmptyStringSchema),
  }
);

const GitToolRequirementSchema = closedObject(
  {},
  {
    executable: NonEmptyStringSchema,
    expectedVersion: NonEmptyStringSchema,
  }
);

const BunToolRequirementSchema = closedObject(
  {},
  {
    executable: NonEmptyStringSchema,
    expectedVersion: NonEmptyStringSchema,
    expectedRevision: NonEmptyStringSchema,
  }
);

const GitBunCommandPolicySchema = closedObject(
  {},
  {
    timeoutMs: Type.Integer({ minimum: 1, maximum: MaximumTimerDelayMs }),
    terminationGraceMs: Type.Integer({
      minimum: 1,
      maximum: MaximumTimerDelayMs,
    }),
  }
);

export const GitBunConfigSchema = closedObject(
  {},
  {
    git: GitToolRequirementSchema,
    bun: BunToolRequirementSchema,
    scratchRoot: NonEmptyStringSchema,
    command: GitBunCommandPolicySchema,
  }
);

const CanonicalSettingSchema = closedObject(
  {},
  {
    name: NonEmptyStringSchema,
    value: Type.String(),
  }
);

const GitCanonicalizationSchema = closedObject(
  {},
  {
    environment: Type.Array(CanonicalSettingSchema, { minItems: 1, uniqueItems: true }),
    configuration: Type.Array(CanonicalSettingSchema, { minItems: 1, uniqueItems: true }),
    attributesPolicy: NonEmptyStringSchema,
    stageArguments: Type.Array(Type.String(), { minItems: 1 }),
    diffArguments: Type.Array(Type.String(), { minItems: 1 }),
    applyArguments: Type.Array(Type.String(), { minItems: 1 }),
  }
);

export const GitPatchSubstrateIdentitySchema = closedObject(
  {},
  {
    kind: Type.Literal("CanonicalGitPatchV1"),
    git: ResolvedToolIdentitySchema,
    canonicalization: GitCanonicalizationSchema,
    environmentDigest: DigestIdentitySchema,
    configurationDigest: DigestIdentitySchema,
  }
);

const BunPackageCanonicalizationSchema = closedObject(
  {},
  {
    environment: Type.Array(CanonicalSettingSchema, { minItems: 1, uniqueItems: true }),
    buildArguments: Type.Array(Type.String(), { minItems: 1 }),
    packArguments: Type.Array(Type.String(), { minItems: 1 }),
  }
);

export const BunPackageSubstrateIdentitySchema = closedObject(
  {},
  {
    kind: Type.Literal("ImmutableBunPackageV1"),
    bun: ResolvedToolIdentitySchema,
    canonicalization: BunPackageCanonicalizationSchema,
    environmentDigest: DigestIdentitySchema,
    configurationDigest: DigestIdentitySchema,
  }
);

const ExactArtifactPathSchema = closedObject(
  {},
  {
    kind: Type.Literal("Exact"),
    path: NonEmptyStringSchema,
  }
);

const ArtifactPathTreeSchema = closedObject(
  {},
  {
    kind: Type.Literal("Tree"),
    path: NonEmptyStringSchema,
  }
);

const ArtifactPathRuleSchema = Type.Union([ExactArtifactPathSchema, ArtifactPathTreeSchema]);

export const ArtifactPathMappingSchema = closedObject(
  {},
  {
    submit: Type.Array(ArtifactPathRuleSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    ignore: Type.Array(ArtifactPathRuleSchema, { uniqueItems: true }),
  }
);

export const ExactGitRevisionSchema = closedObject(
  {},
  {
    repositoryIdentity: DigestIdentitySchema,
    commitObjectId: GitObjectIdSchema,
    rootTreeObjectId: GitObjectIdSchema,
    selectedTreeObjectId: GitObjectIdSchema,
    objectFormat: Type.Union([Type.Literal("sha1"), Type.Literal("sha256")]),
    subtree: Type.Optional(NonEmptyStringSchema),
  }
);

const PatchIdentityProperties = {
  substrate: GitPatchSubstrateIdentitySchema,
  baseline: ExactGitRevisionSchema,
  pathMappingDigest: DigestIdentitySchema,
  productTreeObjectId: GitObjectIdSchema,
};

const CapturedPatchDescriptorSchema = closedObject(PatchIdentityProperties, {
  kind: Type.Literal("Captured"),
  patchDigest: DigestIdentitySchema,
  byteLength: Type.Integer({ minimum: 1 }),
});

const EmptyPatchDescriptorSchema = closedObject(PatchIdentityProperties, {
  kind: Type.Literal("Empty"),
});

export const PatchDescriptorSchema = Type.Union([
  CapturedPatchDescriptorSchema,
  EmptyPatchDescriptorSchema,
]);

const InstalledRuntimeDependencyEdgeSchema = closedObject(
  {},
  {
    dependencyName: NonEmptyStringSchema,
    dependencyKind: Type.Union([
      Type.Literal("Dependency"),
      Type.Literal("OptionalDependency"),
      Type.Literal("PeerDependency"),
      Type.Literal("OptionalPeerDependency"),
    ]),
    requested: NonEmptyStringSchema,
    installed: Type.Literal(true),
    targetNodeId: NonEmptyStringSchema,
  }
);

const AbsentRuntimeDependencyEdgeSchema = closedObject(
  {},
  {
    dependencyName: NonEmptyStringSchema,
    dependencyKind: Type.Union([
      Type.Literal("OptionalDependency"),
      Type.Literal("OptionalPeerDependency"),
    ]),
    requested: NonEmptyStringSchema,
    installed: Type.Literal(false),
  }
);

const RuntimeDependencyEdgeSchema = Type.Union([
  InstalledRuntimeDependencyEdgeSchema,
  AbsentRuntimeDependencyEdgeSchema,
]);

const RuntimePackageNodeSchema = closedObject(
  {},
  {
    nodeId: NonEmptyStringSchema,
    name: NonEmptyStringSchema,
    version: NonEmptyStringSchema,
    resolution: NonEmptyStringSchema,
    integrity: NonEmptyStringSchema,
    packageManifestDigest: DigestIdentitySchema,
    packageContentDigest: DigestIdentitySchema,
    dependencies: Type.Array(RuntimeDependencyEdgeSchema, {
      uniqueItems: true,
    }),
  }
);

const RootedRuntimeGraphSchema = closedObject(
  {},
  {
    rootNodeId: NonEmptyStringSchema,
    platform: NonEmptyStringSchema,
    architecture: NonEmptyStringSchema,
    nodes: Type.Array(RuntimePackageNodeSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    graphDigest: DigestIdentitySchema,
  }
);

export const PackedPackageDescriptorSchema = closedObject(
  {},
  {
    kind: Type.Literal("PackedPackage"),
    packageName: Type.Literal("@rawr/research-sdk"),
    packageVersion: NonEmptyStringSchema,
    protocolVersion: NonEmptyStringSchema,
    embeddedManifestPath: Type.Literal("dist/research-sdk-runtime-graph.json"),
    substrate: BunPackageSubstrateIdentitySchema,
    contentDigest: DigestIdentitySchema,
    embeddedManifestDigest: DigestIdentitySchema,
    byteLength: Type.Integer({ minimum: 1 }),
    ownerLockDigest: DigestIdentitySchema,
    runtimeGraph: RootedRuntimeGraphSchema,
  }
);

export type ResolvedToolIdentity = Static<typeof ResolvedToolIdentitySchema>;
export type GitBunConfig = Static<typeof GitBunConfigSchema>;
export type GitCanonicalization = Static<typeof GitCanonicalizationSchema>;
export type GitPatchSubstrateIdentity = Static<typeof GitPatchSubstrateIdentitySchema>;
export type BunPackageCanonicalization = Static<typeof BunPackageCanonicalizationSchema>;
export type BunPackageSubstrateIdentity = Static<typeof BunPackageSubstrateIdentitySchema>;
export type ArtifactPathRule = Static<typeof ArtifactPathRuleSchema>;
export type ArtifactPathMapping = Static<typeof ArtifactPathMappingSchema>;
export type ExactGitRevision = Static<typeof ExactGitRevisionSchema>;
export type PatchDescriptor = Static<typeof PatchDescriptorSchema>;
export type RuntimeDependencyEdge = Static<typeof RuntimeDependencyEdgeSchema>;
export type RuntimePackageNode = Static<typeof RuntimePackageNodeSchema>;
export type RootedRuntimeGraph = Static<typeof RootedRuntimeGraphSchema>;
export type PackedPackageDescriptor = Static<typeof PackedPackageDescriptorSchema>;
