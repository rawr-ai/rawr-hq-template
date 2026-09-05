import { type Static, Type } from "typebox";
import { Check } from "typebox/value";
import { type RuntimeObservationSeed, RuntimeObservationSeedSchema } from "./catalog";
import { fields, telemetryData } from "./data";

const identityFields = ["app", "process", "entrypoint", "deployment", "source"] as const;
const requiredFields = ["identity", "surfacePlanId", "path", "outcome"] as const;
const optionalFields = ["errorCode", "nativeEffect", "traceId"] as const;
const schema = Type.Object(
  {
    kind: Type.Literal("server.procedure.settled"),
    identity: Type.Index(RuntimeObservationSeedSchema, ["identity"]),
    surfacePlanId: Type.String({ minLength: 1 }),
    path: Type.Array(Type.String()),
    outcome: Type.Union([Type.Literal("returned"), Type.Literal("rejected")]),
    errorCode: Type.Optional(Type.String({ minLength: 1 })),
    nativeEffect: Type.Optional(
      Type.Object(
        { typedFailure: Type.Boolean(), defect: Type.Boolean(), interrupted: Type.Boolean() },
        { additionalProperties: false }
      )
    ),
    traceId: Type.Optional(Type.String({ pattern: "^[0-9a-f]{32}$" })),
  },
  { additionalProperties: false }
);
export type ServerProcedureRecord = Static<typeof schema>;

/** A native procedure return is not stream completion or ExecutionRegistry evidence. */
export function readServerProcedureRecord(
  envelope: Record<string, unknown>,
  seed: RuntimeObservationSeed
): ServerProcedureRecord | undefined {
  if (
    envelope.kind !== "server.procedure.settled" ||
    envelope.phase !== "observation" ||
    envelope.boundary !== "runtime-process-runtime" ||
    envelope.correlationId !== seed.identity.process ||
    envelope.payload === null ||
    typeof envelope.payload !== "object"
  )
    return undefined;
  const payload = fields(envelope.payload, [
    ...requiredFields,
    ...optionalFields.filter((name) => Object.hasOwn(envelope.payload as object, name)),
  ]);
  if (payload === undefined) return undefined;
  const identity = fields(payload.identity, identityFields);
  if (identity === undefined || identityFields.some((key) => identity[key] !== seed.identity[key]))
    return undefined;
  // Reject nested accessors before schema validation; never inspect unknown outer fields.
  const candidate = telemetryData({ ...payload, identity, kind: envelope.kind });
  if (!Check(schema, candidate)) return undefined;
  if (
    !seed.surfaces.some(
      (surface) =>
        surface.surfacePlanId === candidate.surfacePlanId &&
        surface.role === "server" &&
        ["server/api", "server/internal"].includes(surface.surface)
    )
  )
    return undefined;
  return candidate;
}
