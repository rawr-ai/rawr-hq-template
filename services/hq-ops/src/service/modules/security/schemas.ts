import { type Static, Type } from "typebox";

export const SecurityModeSchema = Type.Union([Type.Literal("staged"), Type.Literal("repo")]);
export const FindingSeveritySchema = Type.Union([
  Type.Literal("info"),
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
  Type.Literal("critical"),
]);
export const RiskToleranceSchema = Type.Union([
  Type.Literal("strict"),
  Type.Literal("balanced"),
  Type.Literal("permissive"),
  Type.Literal("off"),
]);

const VulnerabilityFindingSchema = Type.Object(
  {
    kind: Type.Literal("vulnerability"),
    severity: FindingSeveritySchema,
    packageName: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1 }),
    url: Type.Optional(Type.String({ minLength: 1 })),
    advisoryId: Type.Optional(Type.Number()),
    vulnerableVersions: Type.Optional(Type.String({ minLength: 1 })),
    cvssScore: Type.Optional(Type.Number()),
    cwe: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);

const UntrustedDependencyScriptsFindingSchema = Type.Object(
  {
    kind: Type.Literal("untrustedDependencyScripts"),
    severity: Type.Literal("high"),
    count: Type.Number(),
    rawOutput: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

const SecretFindingSchema = Type.Object(
  {
    kind: Type.Literal("secret"),
    severity: Type.Union([Type.Literal("high"), Type.Literal("critical")]),
    path: Type.String({ minLength: 1 }),
    patternId: Type.String({ minLength: 1 }),
    match: Type.String({ minLength: 1 }),
    index: Type.Number(),
  },
  { additionalProperties: false },
);

const ToolErrorFindingSchema = Type.Object(
  {
    kind: Type.Literal("toolError"),
    severity: Type.Literal("high"),
    tool: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    rawOutput: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const SecurityFindingSchema = Type.Union([
  VulnerabilityFindingSchema,
  UntrustedDependencyScriptsFindingSchema,
  SecretFindingSchema,
  ToolErrorFindingSchema,
]);

export const SecurityReportSchema = Type.Object(
  {
    ok: Type.Boolean(),
    findings: Type.Array(SecurityFindingSchema),
    summary: Type.String(),
    timestamp: Type.String({ minLength: 1 }),
    mode: SecurityModeSchema,
    meta: Type.Optional(
      Type.Object(
        {
          pluginId: Type.Optional(Type.String({ minLength: 1 })),
          repoRoot: Type.Optional(Type.String({ minLength: 1 })),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const SecurityReportWithPathSchema = Type.Object(
  {
    ok: Type.Boolean(),
    findings: Type.Array(SecurityFindingSchema),
    summary: Type.String(),
    timestamp: Type.String({ minLength: 1 }),
    mode: SecurityModeSchema,
    meta: Type.Optional(
      Type.Object(
        {
          pluginId: Type.Optional(Type.String({ minLength: 1 })),
          repoRoot: Type.Optional(Type.String({ minLength: 1 })),
        },
        { additionalProperties: false },
      ),
    ),
    reportPath: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const SecurityGateEnableResultSchema = Type.Object(
  {
    allowed: Type.Boolean(),
    report: SecurityReportWithPathSchema,
    requiresForce: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type SecurityReport = Static<typeof SecurityReportSchema>;
