import { type Static, Type } from "typebox";
import { closedObject, PortableDataSchema } from "./schema.js";

export const NonEmptyStringSchema = Type.String({ minLength: 1 });
export const Sha256DigestSchema = Type.String({ pattern: "^[a-f0-9]{64}$" });

export const DigestIdentitySchema = closedObject(
  {},
  {
    algorithm: Type.Literal("sha256"),
    preimageKind: NonEmptyStringSchema,
    value: Sha256DigestSchema,
  }
);

export const StudyIdentitySchema = closedObject(
  {},
  {
    studyId: NonEmptyStringSchema,
    revision: NonEmptyStringSchema,
  }
);

export const OriginalInstanceSchema = closedObject(
  {},
  {
    kind: Type.Literal("Original"),
    instanceId: NonEmptyStringSchema,
  }
);

const DerivedInstanceProperties = {
  instanceId: NonEmptyStringSchema,
  predecessorInstanceId: NonEmptyStringSchema,
  reason: NonEmptyStringSchema,
};

export const ReplicateInstanceSchema = closedObject(
  {},
  {
    kind: Type.Literal("Replicate"),
    ...DerivedInstanceProperties,
  }
);

export const ReplayInstanceSchema = closedObject(
  {},
  {
    kind: Type.Literal("Replay"),
    ...DerivedInstanceProperties,
  }
);

export const InvocationInstanceSchema = Type.Union([
  OriginalInstanceSchema,
  ReplicateInstanceSchema,
  ReplayInstanceSchema,
]);

export const CellKeySchema = closedObject(
  {},
  {
    study: StudyIdentitySchema,
    caseId: NonEmptyStringSchema,
    conditionId: NonEmptyStringSchema,
    profileId: NonEmptyStringSchema,
    instance: InvocationInstanceSchema,
  }
);

export const DeclaredAuthoritySchema = closedObject(
  {},
  {
    kind: NonEmptyStringSchema,
    identity: NonEmptyStringSchema,
    revision: NonEmptyStringSchema,
    digest: Type.Optional(DigestIdentitySchema),
  }
);

export const ArtifactSubstrateSchema = closedObject(
  {},
  {
    kind: NonEmptyStringSchema,
    identity: PortableDataSchema,
    identityDigest: DigestIdentitySchema,
  }
);

export const FrozenInputSchema = closedObject(
  {},
  {
    canonicalInput: DigestIdentitySchema,
    authorities: Type.Array(DeclaredAuthoritySchema, { minItems: 1 }),
    artifactSubstrate: Type.Optional(ArtifactSubstrateSchema),
  }
);

export type Sha256Digest = Static<typeof Sha256DigestSchema>;
export type DigestIdentity = Static<typeof DigestIdentitySchema>;
export type StudyIdentity = Static<typeof StudyIdentitySchema>;
export type InvocationInstance = Static<typeof InvocationInstanceSchema>;
export type CellKey = Static<typeof CellKeySchema>;
export type DeclaredAuthority = Static<typeof DeclaredAuthoritySchema>;
export type ArtifactSubstrate = Static<typeof ArtifactSubstrateSchema>;
export type FrozenInput = Static<typeof FrozenInputSchema>;

export interface SemanticIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function validateCellKeySemantics(cell: CellKey): readonly SemanticIssue[] {
  if (
    cell.instance.kind !== "Original" &&
    cell.instance.instanceId === cell.instance.predecessorInstanceId
  ) {
    return [
      {
        code: "instance.self-predecessor",
        path: "/instance/predecessorInstanceId",
        message: "A replicate or replay must name a different predecessor instance.",
      },
    ];
  }

  return [];
}
