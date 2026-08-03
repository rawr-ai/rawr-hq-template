import { type Static, Type } from "typebox";

/** Boundary projection of one integrity issue observed for a Hyperresearch run. */
export const HyperresearchIntegrityFindingSchema = Type.Object(
  {
    severity: Type.Union([Type.Literal("blocking"), Type.Literal("warning")]),
    code: Type.Union([
      Type.Literal("awaiting-agent-output"),
      Type.Literal("failed-agent-job"),
      Type.Literal("missing-step-load"),
      Type.Literal("missing-required-artifact"),
      Type.Literal("failed-cli-call"),
      Type.Literal("failed-step"),
      Type.Literal("incomplete-run"),
      Type.Literal("open-review-finding"),
      Type.Literal("patch-only-violation"),
      Type.Literal("missing-source-capture"),
      Type.Literal("missing-claim-trace"),
      Type.Literal("missing-agent-output"),
      Type.Literal("agent-output-conflict"),
      Type.Literal("missing-agent-output-acceptance"),
      Type.Literal("invalid-replacement-attempt"),
    ]),
    message: Type.String({ minLength: 1 }),
    stepId: Type.Optional(Type.String({ minLength: 1 })),
    artifact: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Boundary projection of one integrity issue observed for a Hyperresearch run. */
export type HyperresearchIntegrityFinding = Static<typeof HyperresearchIntegrityFindingSchema>;
