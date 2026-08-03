import { type Static, Type } from "typebox";

/** Artifact write projected across the delegated-agent output boundary. */
export const HyperresearchAgentArtifactWriteSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    sha256: Type.String({ minLength: 1 }),
    summary: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** Artifact write projected across the delegated-agent output boundary. */
export type HyperresearchAgentArtifactWrite = Static<typeof HyperresearchAgentArtifactWriteSchema>;

/** Result projection accepted from one delegated Hyperresearch agent job. */
export const HyperresearchAgentOutputSchema = Type.Object(
  {
    jobId: Type.String({ minLength: 1 }),
    logicalJobId: Type.Optional(Type.String({ minLength: 1 })),
    attemptId: Type.Optional(Type.String({ minLength: 1 })),
    attemptNumber: Type.Optional(Type.Integer({ minimum: 1 })),
    replacesAttemptId: Type.Optional(Type.String({ minLength: 1 })),
    replacementReason: Type.Optional(Type.String({ minLength: 1 })),
    originalAttemptClassification: Type.Optional(Type.String({ minLength: 1 })),
    role: Type.String({ minLength: 1 }),
    status: Type.Union([Type.Literal("complete"), Type.Literal("failed")]),
    summary: Type.String({ minLength: 1 }),
    evidence: Type.Array(Type.String()),
    artifactWrites: Type.Optional(Type.Array(HyperresearchAgentArtifactWriteSchema)),
    sourceUrls: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    failure: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Result projection accepted from one delegated Hyperresearch agent job. */
export type HyperresearchAgentOutput = Static<typeof HyperresearchAgentOutputSchema>;
