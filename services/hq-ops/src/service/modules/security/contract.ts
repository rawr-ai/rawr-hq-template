import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";

const SecurityModeSchema = Type.Union([Type.Literal("staged"), Type.Literal("repo")]);
const FindingSeveritySchema = Type.Union([
  Type.Literal("info"),
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
  Type.Literal("critical"),
]);
const RiskToleranceSchema = Type.Union([
  Type.Literal("strict"),
  Type.Literal("balanced"),
  Type.Literal("permissive"),
  Type.Literal("off"),
]);

const SecurityFindingSchema = Type.Union([
  Type.Object(
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
  ),
  Type.Object(
    {
      kind: Type.Literal("untrustedDependencyScripts"),
      severity: Type.Literal("high"),
      count: Type.Number(),
      rawOutput: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("secret"),
      severity: Type.Union([Type.Literal("high"), Type.Literal("critical")]),
      path: Type.String({ minLength: 1 }),
      patternId: Type.String({ minLength: 1 }),
      match: Type.String({ minLength: 1 }),
      index: Type.Number(),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("toolError"),
      severity: Type.Literal("high"),
      tool: Type.String({ minLength: 1 }),
      message: Type.String({ minLength: 1 }),
      rawOutput: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
]);

const SecurityReportMetaSchema = Type.Object(
  {
    pluginId: Type.Optional(Type.String({ minLength: 1 })),
    repoRoot: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const SecurityReportSchema = Type.Object(
  {
    ok: Type.Boolean(),
    findings: Type.Array(SecurityFindingSchema),
    summary: Type.String(),
    timestamp: Type.String({ minLength: 1 }),
    mode: SecurityModeSchema,
    meta: Type.Optional(SecurityReportMetaSchema),
  },
  { additionalProperties: false },
);

const SecurityReportWithPathSchema = Type.Object(
  {
    ok: Type.Boolean(),
    findings: Type.Array(SecurityFindingSchema),
    summary: Type.String(),
    timestamp: Type.String({ minLength: 1 }),
    mode: SecurityModeSchema,
    meta: Type.Optional(SecurityReportMetaSchema),
    reportPath: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const SecurityGateEnableResultSchema = Type.Object(
  {
    allowed: Type.Boolean(),
    report: SecurityReportWithPathSchema,
    requiresForce: Type.Boolean(),
  },
  { additionalProperties: false },
);

const SecurityCheckInputSchema = schema(
  Type.Object(
    {
      mode: SecurityModeSchema,
    },
    { additionalProperties: false },
  ),
);

const GateEnableInputSchema = schema(
  Type.Object(
    {
      pluginId: Type.String({ minLength: 1 }),
      riskTolerance: RiskToleranceSchema,
      mode: SecurityModeSchema,
    },
    { additionalProperties: false },
  ),
);

const EmptyInputSchema = schema(Type.Object({}, { additionalProperties: false }));

export const contract = {
  securityCheck: ocBase
    .meta({ idempotent: true, entity: "security" })
    .input(SecurityCheckInputSchema)
    .output(schema(SecurityReportWithPathSchema)),
  gateEnable: ocBase
    .meta({ idempotent: false, entity: "security" })
    .input(GateEnableInputSchema)
    .output(schema(SecurityGateEnableResultSchema)),
  getSecurityReport: ocBase
    .meta({ idempotent: true, entity: "security" })
    .input(EmptyInputSchema)
    .output(schema(Type.Union([SecurityReportSchema, Type.Null()]))),
};
