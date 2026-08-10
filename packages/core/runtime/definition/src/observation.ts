import { type Static, Type } from "typebox";

export const RuntimeLifecyclePhaseSchema = Type.Union([
  Type.Literal("definition"),
  Type.Literal("selection"),
  Type.Literal("derivation"),
  Type.Literal("compilation"),
  Type.Literal("provisioning"),
  Type.Literal("mounting"),
  Type.Literal("observation"),
]);

export type RuntimeLifecyclePhase = Static<typeof RuntimeLifecyclePhaseSchema>;

export const RuntimeObservationRecordSchema = Type.Object(
  {
    phase: RuntimeLifecyclePhaseSchema,
    boundary: Type.String({
      description: "Qualified runtime boundary that emitted the record.",
    }),
    kind: Type.String({
      description: "Stable observation kind within the emitting boundary.",
    }),
    correlationId: Type.String({
      description: "Process or invocation correlation identity.",
    }),
    payload: Type.Unknown({
      description: "Owner-produced bounded payload before observation projection.",
    }),
  },
  { additionalProperties: false }
);

export type RuntimeObservationRecord = Static<typeof RuntimeObservationRecordSchema>;

export interface RuntimeObservationPort {
  publish(record: RuntimeObservationRecord): void;
}
