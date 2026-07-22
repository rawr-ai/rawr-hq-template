import { type Static, type TSchema, Type } from "typebox";
import {
  type CellKey,
  CellKeySchema,
  type DigestIdentity,
  DigestIdentitySchema,
  type SemanticIssue,
} from "./identity.js";
import { closedObject, type Portable, type PortableData, type PortableSchema } from "./schema.js";

export const PredecessorSetSchema = closedObject(
  {},
  {
    kind: Type.Literal("Set"),
    digests: Type.Array(DigestIdentitySchema, { uniqueItems: true }),
  }
);

export const PredecessorClosureSchema = closedObject(
  {},
  {
    kind: Type.Literal("Closure"),
    rootDigests: Type.Array(DigestIdentitySchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    closureDigest: DigestIdentitySchema,
  }
);

export const PredecessorBindingSchema = Type.Union([
  PredecessorSetSchema,
  PredecessorClosureSchema,
]);

export type PredecessorBinding = Static<typeof PredecessorBindingSchema>;

export interface StageOutputKey<Stage extends string = string> {
  readonly stage: Stage;
  readonly cell: CellKey;
  readonly frozenInputDigest: DigestIdentity;
  readonly implementationRevision: string;
  readonly predecessors: PredecessorBinding;
}

export interface StageOutput<Stage extends string = string, Value = PortableData>
  extends StageOutputKey<Stage> {
  readonly outputDigest: DigestIdentity;
  readonly value: Value & Portable<Value>;
}

export interface StageOutputIdentity<Stage extends string = string> extends StageOutputKey<Stage> {
  readonly outputDigest: DigestIdentity;
}

export interface StageOutputShape<Stage extends string = string> extends StageOutputKey<Stage> {
  readonly outputDigest: DigestIdentity;
  readonly value: unknown;
}

export type PortableStageOutput<Output extends StageOutputShape> = Output &
  StageOutput<Output["stage"], Output["value"]>;

export function createStageOutputKeySchema<const Stage extends string>(stage: Stage) {
  return closedObject(
    {},
    {
      stage: Type.Literal(stage),
      cell: CellKeySchema,
      frozenInputDigest: DigestIdentitySchema,
      implementationRevision: Type.String({ minLength: 1 }),
      predecessors: PredecessorBindingSchema,
    }
  );
}

export function createStageOutputSchema<
  const Stage extends string,
  const ValueSchema extends TSchema,
>(stage: Stage, value: ValueSchema & PortableSchema<ValueSchema>) {
  return closedObject(createStageOutputKeySchema(stage).properties, {
    outputDigest: DigestIdentitySchema,
    value,
  });
}

export function createStageOutputIdentitySchema<const Stage extends string>(stage: Stage) {
  return closedObject(createStageOutputKeySchema(stage).properties, {
    outputDigest: DigestIdentitySchema,
  });
}

export function validatePredecessorSemantics(
  binding: PredecessorBinding
): readonly SemanticIssue[] {
  const digests = binding.kind === "Set" ? binding.digests : binding.rootDigests;
  const sorted = [...digests].sort((left, right) => {
    const leftKey = `${left.preimageKind}\u0000${left.value}`;
    const rightKey = `${right.preimageKind}\u0000${right.value}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  for (let index = 0; index < digests.length; index += 1) {
    if (
      digests[index]?.preimageKind !== sorted[index]?.preimageKind ||
      digests[index]?.value !== sorted[index]?.value
    ) {
      return [
        {
          code: "predecessors.noncanonical-order",
          path: binding.kind === "Set" ? "/digests" : "/rootDigests",
          message: "Predecessor digests must be unique and lexically ordered.",
        },
      ];
    }
  }

  return [];
}
