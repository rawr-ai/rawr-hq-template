import { type Static, Type } from "typebox";

/** Maximum stable issues returned by one rejected resolution. */
export const MAX_CATALOG_ISSUES = 100;

const IdSchema = Type.String({
  minLength: 1,
  maxLength: 200,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
  description: "Lowercase Habitat identity.",
});

const ProjectIdSchema = Type.String({
  minLength: 1,
  maxLength: 250,
  description: "Repository project identity that owns an admitted instance.",
});

const InstanceIdSchema = Type.String({
  minLength: 1,
  maxLength: 250,
  pattern: "^(?!.*\\.\\.)(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$",
  description: "Repository-unique Habitat instance identity.",
});

const RelativePathSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  description: "Normalized repository-relative path.",
});

const PackageNameSchema = Type.String({
  minLength: 1,
  maxLength: 214,
  description: "Exact npm package identity.",
});

const PackageVersionSchema = Type.String({
  minLength: 1,
  maxLength: 200,
  description: "Version declared by the selected npm package.",
});

const AbsolutePathSchema = Type.String({
  minLength: 1,
  maxLength: 16_384,
  description: "Resolved absolute filesystem path.",
});

const PathKindSchema = Type.Union([Type.Literal("directory"), Type.Literal("file")], {
  description: "Expected filesystem entry kind.",
});

const RuleLaneSchema = Type.Union([Type.Literal("enforced"), Type.Literal("advisory")], {
  description: "Policy lane declared by a Habitat rule.",
});

const PatternNameSchema = Type.String({
  minLength: 1,
  maxLength: 500,
  description: "Named Grit pattern invoked by a rule.",
});

const RuleMessageSchema = Type.String({
  minLength: 1,
  maxLength: 8_192,
  description: "Caller-facing message for a rule finding.",
});

const RuleRemediationSchema = Type.Union([Type.String({ maxLength: 16_384 }), Type.Null()], {
  description: "Remediation guidance when the rule supplies it.",
});

const CatalogIssueCodeSchema = Type.Union(
  [
    Type.Literal("authority-anchor-mismatch"),
    Type.Literal("authority-blueprint-missing"),
    Type.Literal("authority-compatibility-invalid"),
    Type.Literal("authority-definition-invalid"),
    Type.Literal("authority-definition-kind-mismatch"),
    Type.Literal("authority-duplicate-blueprint"),
    Type.Literal("authority-duplicate-instance"),
    Type.Literal("authority-duplicate-rule"),
    Type.Literal("authority-filesystem-failed"),
    Type.Literal("authority-json-invalid"),
    Type.Literal("authority-manifest-invalid"),
    Type.Literal("authority-order-invalid"),
    Type.Literal("authority-path-escape"),
    Type.Literal("authority-path-invalid"),
    Type.Literal("authority-path-kind-mismatch"),
    Type.Literal("authority-path-missing"),
    Type.Literal("authority-package-name-mismatch"),
    Type.Literal("authority-policy-pack-members-unsupported"),
    Type.Literal("authority-resolution-failed"),
    Type.Literal("authority-rule-invalid"),
    Type.Literal("authority-schema-invalid"),
    Type.Literal("authority-toml-invalid"),
    Type.Literal("authority-version-mismatch"),
    Type.Literal("authority-workspace-root-invalid"),
  ],
  { description: "Closed stable catalog issue identity." }
);

/** npm metadata fields that own selected policy-pack package identity. */
export const PolicyPackPackageJsonSchema = Type.Object(
  {
    name: PackageNameSchema,
    version: PackageVersionSchema,
  },
  { additionalProperties: true, description: "Selected policy-pack npm metadata." }
);

const PolicyPackBlueprintMemberSchema = Type.Object(
  {
    id: IdSchema,
    version: Type.Integer({ minimum: 1, description: "Exact blueprint version." }),
    path: RelativePathSchema,
  },
  { additionalProperties: false, description: "One declared policy-pack blueprint member." }
);

/** Closed selected policy-pack protocol 1 manifest. */
export const PolicyPackManifestSchema = Type.Object(
  {
    protocolVersion: Type.Literal(1, { description: "Supported policy-pack protocol." }),
    blueprints: Type.Array(PolicyPackBlueprintMemberSchema, {
      description: "Closed declared blueprint member set.",
    }),
  },
  { additionalProperties: false, description: "Closed Habitat policy-pack manifest." }
);

const BlueprintGritAcquisitionSchema = Type.Object(
  {
    kind: Type.Union([Type.Literal("check"), Type.Literal("apply-dry-run")], {
      description: "Rule evaluation operation admitted for the Grit runner.",
    }),
    rootRoles: Type.Array(IdSchema, {
      uniqueItems: true,
      description: "Root roles whose bound paths enter evaluation.",
    }),
    selections: Type.Array(IdSchema, {
      uniqueItems: true,
      description: "Selection axes whose members enter evaluation.",
    }),
  },
  { additionalProperties: false, description: "Blueprint-level Grit acquisition declaration." }
);

const BlueprintStructureRunnerSchema = Type.Object(
  {
    name: Type.Literal("habitat", { description: "Native Habitat runner identity." }),
    mode: Type.Literal("structure", { description: "Native structural evaluation mode." }),
    structure: RelativePathSchema,
  },
  { additionalProperties: false, description: "Blueprint structural runner declaration." }
);

const BlueprintGritRunnerSchema = Type.Object(
  {
    name: Type.Literal("grit", { description: "Grit runner identity." }),
    pattern: RelativePathSchema,
    patternName: PatternNameSchema,
    acquisition: BlueprintGritAcquisitionSchema,
  },
  { additionalProperties: false, description: "Blueprint Grit runner declaration." }
);

const BlueprintRuleDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    lane: RuleLaneSchema,
    message: RuleMessageSchema,
    remediate: RuleRemediationSchema,
    runner: Type.Union([BlueprintStructureRunnerSchema, BlueprintGritRunnerSchema], {
      description: "Mechanical runner declaration resolved for each application.",
    }),
  },
  { additionalProperties: false, description: "One reusable blueprint rule." }
);

const BlueprintRootDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    required: Type.Boolean({ description: "Whether every instance must bind this root role." }),
    kind: PathKindSchema,
  },
  { additionalProperties: false, description: "One named instance root role." }
);

const BlueprintSelectionDefinitionSchema = Type.Object(
  {
    id: IdSchema,
    root: IdSchema,
    kind: PathKindSchema,
    memberPattern: Type.String({
      minLength: 1,
      maxLength: 2_048,
      description: "Regular expression that admits member identities.",
    }),
    pathTemplate: Type.String({
      minLength: 1,
      maxLength: 4_096,
      description: "Root-relative path template containing one {member} placeholder.",
    }),
  },
  { additionalProperties: false, description: "Package-style selected-member axis." }
);

/** Closed schema for one version 3 blueprint definition document. */
export const BlueprintDefinitionSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1, { description: "Blueprint document schema version." }),
    id: IdSchema,
    version: Type.Integer({ minimum: 1, description: "Positive blueprint version." }),
    rules: Type.Array(BlueprintRuleDefinitionSchema, {
      description: "Sorted reusable rules supplied by this blueprint version.",
    }),
    instance: Type.Object(
      {
        manifest: Type.Literal("habitat.toml", {
          description: "Only admitted instance manifest basename.",
        }),
        anchorRoot: IdSchema,
        roots: Type.Array(BlueprintRootDefinitionSchema, {
          minItems: 1,
          description: "Sorted closed root-role vocabulary for instances.",
        }),
        selections: Type.Array(BlueprintSelectionDefinitionSchema, {
          description: "Sorted closed package-style selection vocabulary.",
        }),
      },
      { additionalProperties: false, description: "Instance vocabulary for this blueprint." }
    ),
  },
  { additionalProperties: false, description: "Version 3 local blueprint definition authority." }
);

/** Closed schema for one version 3 local instance document. */
export const HabitatInstanceManifestSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1, { description: "Instance document schema version." }),
    id: InstanceIdSchema,
    ownerProject: ProjectIdSchema,
    blueprint: IdSchema,
    blueprintVersion: Type.Integer({
      minimum: 1,
      description: "Exact selected blueprint version.",
    }),
    roots: Type.Record(IdSchema, RelativePathSchema, {
      additionalProperties: false,
      description: "Root-role bindings keyed by blueprint root identity.",
    }),
    selections: Type.Record(
      IdSchema,
      Type.Array(IdSchema, {
        minItems: 1,
        uniqueItems: true,
        description: "Sorted selected member identities for one axis.",
      }),
      { additionalProperties: false, description: "Selected members keyed by axis identity." }
    ),
  },
  { additionalProperties: false, description: "Version 3 local Habitat instance authority." }
);

const LocalAuthorityProvenanceSchema = Type.Object(
  {
    kind: Type.Literal("local", { description: "Local repository authority kind." }),
    authorityRoot: AbsolutePathSchema,
    relativePath: RelativePathSchema,
  },
  { additionalProperties: false, description: "Local authority origin for a resolved fact." }
);

const BlueprintDefinitionRecordSchema = Type.Object(
  {
    definition: BlueprintDefinitionSchema,
    provenance: LocalAuthorityProvenanceSchema,
  },
  { additionalProperties: false, description: "Admitted local blueprint with provenance." }
);

const ResolvedRootSchema = Type.Object(
  {
    id: IdSchema,
    required: Type.Boolean({ description: "Whether the blueprint requires this root." }),
    kind: PathKindSchema,
    path: RelativePathSchema,
  },
  { additionalProperties: false, description: "Resolved instance root binding." }
);

const ResolvedSelectionMemberSchema = Type.Object(
  {
    id: IdSchema,
    kind: PathKindSchema,
    path: RelativePathSchema,
  },
  { additionalProperties: false, description: "Resolved selected member path." }
);

const ResolvedSelectionSchema = Type.Object(
  {
    id: IdSchema,
    root: IdSchema,
    members: Type.Array(ResolvedSelectionMemberSchema, {
      minItems: 1,
      description: "Resolved members in stable identity order.",
    }),
  },
  { additionalProperties: false, description: "Resolved package-style selection." }
);

const ResolvedBlueprintInstanceSchema = Type.Object(
  {
    id: InstanceIdSchema,
    ownerProject: ProjectIdSchema,
    blueprint: IdSchema,
    blueprintVersion: Type.Integer({ minimum: 1, description: "Resolved blueprint version." }),
    manifestPath: RelativePathSchema,
    roots: Type.Array(ResolvedRootSchema, {
      minItems: 1,
      description: "Bound instance roots in stable role order.",
    }),
    selections: Type.Array(ResolvedSelectionSchema, {
      description: "Resolved selected-member axes in stable identity order.",
    }),
  },
  { additionalProperties: false, description: "One fully admitted local blueprint instance." }
);

const ResolvedRuleAssetSchema = Type.Object(
  {
    provenance: LocalAuthorityProvenanceSchema,
    relativePath: RelativePathSchema,
    absolutePath: AbsolutePathSchema,
  },
  { additionalProperties: false, description: "Resolved local runner asset." }
);

const ResolvedRootBindingSchema = Type.Object(
  {
    rootRole: IdSchema,
    required: Type.Boolean({ description: "Whether the application requires this binding." }),
    kind: PathKindSchema,
    path: Type.Optional(RelativePathSchema),
  },
  { additionalProperties: false, description: "Structure-runner root binding." }
);

const AcquisitionSourceSchema = Type.Union(
  [
    Type.Object(
      {
        kind: Type.Literal("root-role", { description: "Root-role acquisition source." }),
        id: IdSchema,
      },
      { additionalProperties: false, description: "Acquisition from one bound root role." }
    ),
    Type.Object(
      {
        kind: Type.Literal("selection", { description: "Selected-member acquisition source." }),
        id: IdSchema,
        member: IdSchema,
      },
      { additionalProperties: false, description: "Acquisition from one selected member." }
    ),
  ],
  { description: "Origin of one resolved acquisition path." }
);

const ResolvedAcquisitionEntrySchema = Type.Object(
  {
    source: AcquisitionSourceSchema,
    kind: PathKindSchema,
    path: RelativePathSchema,
  },
  { additionalProperties: false, description: "One resolved Grit acquisition entry." }
);

const ResolvedStructureRunnerSchema = Type.Object(
  {
    name: Type.Literal("habitat", { description: "Native Habitat runner identity." }),
    mode: Type.Literal("structure", { description: "Native structural evaluation mode." }),
    structure: ResolvedRuleAssetSchema,
    rootBindings: Type.Array(ResolvedRootBindingSchema, {
      minItems: 1,
      description: "Resolved root bindings available to the structure runner.",
    }),
  },
  { additionalProperties: false, description: "Resolved structure runner facts." }
);

const ResolvedGritRunnerSchema = Type.Object(
  {
    name: Type.Literal("grit", { description: "Grit runner identity." }),
    pattern: ResolvedRuleAssetSchema,
    patternName: PatternNameSchema,
    acquisition: Type.Object(
      {
        kind: Type.Union([Type.Literal("check"), Type.Literal("apply-dry-run")], {
          description: "Resolved Grit operation kind.",
        }),
        entries: Type.Array(ResolvedAcquisitionEntrySchema, {
          minItems: 1,
          description: "Resolved acquisition paths in stable source order.",
        }),
      },
      { additionalProperties: false, description: "Resolved Grit acquisition facts." }
    ),
  },
  { additionalProperties: false, description: "Resolved Grit runner facts." }
);

const ResolvedRuleApplicationSchema = Type.Object(
  {
    ownerProject: ProjectIdSchema,
    instanceId: InstanceIdSchema,
    blueprint: IdSchema,
    blueprintVersion: Type.Integer({ minimum: 1, description: "Resolved blueprint version." }),
    ruleId: IdSchema,
    manifestPath: RelativePathSchema,
    lane: RuleLaneSchema,
    message: RuleMessageSchema,
    remediate: RuleRemediationSchema,
    provenance: LocalAuthorityProvenanceSchema,
    runner: Type.Union([ResolvedStructureRunnerSchema, ResolvedGritRunnerSchema], {
      description: "Fully resolved runner and acquisition facts.",
    }),
  },
  { additionalProperties: false, description: "One resolved instance/rule application." }
);

const CompatibilityPlacementSchema = Type.Object(
  {
    niche: Type.String({
      minLength: 1,
      description: "Frozen version-two niche classification.",
    }),
    blueprint: Type.String({
      minLength: 1,
      description: "Frozen version-two blueprint classification.",
    }),
    category: Type.Union(
      [
        Type.Literal("boundary"),
        Type.Literal("contract"),
        Type.Literal("execution"),
        Type.Literal("output"),
        Type.Literal("policy"),
        Type.Literal("quality"),
        Type.Literal("structure"),
      ],
      { description: "Frozen version-two rule category." }
    ),
  },
  { additionalProperties: false, description: "Legacy rule classification metadata." }
);

const CompatibilityPathCoverageSchema = Type.Object(
  {
    kind: Type.Literal("exact-path", {
      description: "Legacy exact repository-path subject declaration.",
    }),
    patterns: Type.Array(
      Type.String({
        minLength: 1,
        maxLength: 4_096,
        description: "Repository-relative path or glob admitted for checking and caching.",
      }),
      {
        minItems: 1,
        uniqueItems: true,
        description: "Unique repository path patterns covered by the rule.",
      }
    ),
  },
  { additionalProperties: false, description: "Legacy exact-path coverage entry." }
);

const CompatibilitySupportFilesSchema = Type.Object(
  {
    baseline: RelativePathSchema,
  },
  { additionalProperties: false, description: "Legacy rule support-file locators." }
);

const CompatibilityGritRunnerSourceSchema = Type.Object(
  {
    name: Type.Literal("grit", { description: "Grit runner identity." }),
    files: Type.Object(
      {
        pattern: RelativePathSchema,
      },
      { additionalProperties: false, description: "Grit rule asset locator." }
    ),
    patternName: PatternNameSchema,
    acquisition: Type.Object(
      {
        kind: Type.Literal("check", { description: "Supported compatibility operation." }),
        roots: Type.Array(RelativePathSchema, {
          minItems: 1,
          uniqueItems: true,
          description: "Concrete repository roots supplied to Grit.",
        }),
      },
      { additionalProperties: false, description: "Compatibility Grit acquisition roots." }
    ),
  },
  { additionalProperties: false, description: "Supported legacy Grit runner declaration." }
);

const CompatibilityStructureRunnerSourceSchema = Type.Object(
  {
    name: Type.Literal("habitat", { description: "Native Habitat runner identity." }),
    mode: Type.Literal("structure", { description: "Native structure evaluation mode." }),
    files: Type.Object(
      {
        structure: RelativePathSchema,
      },
      { additionalProperties: false, description: "Structure rule asset locator." }
    ),
  },
  { additionalProperties: false, description: "Supported legacy structure runner declaration." }
);

const CompatibilityRuleSourceCommon = {
  schemaVersion: Type.Literal(2, { description: "Legacy rule schema version." }),
  id: IdSchema,
  title: Type.String({ minLength: 1, maxLength: 500, description: "Legacy rule title." }),
  placement: CompatibilityPlacementSchema,
  operation: Type.Object(
    {
      kind: Type.Literal("check", { description: "Only admitted compatibility operation." }),
    },
    { additionalProperties: false, description: "Legacy rule operation." }
  ),
  ownerProject: ProjectIdSchema,
  lane: Type.Literal("enforced", { description: "Only admitted compatibility policy lane." }),
  forbids: Type.String({
    minLength: 1,
    maxLength: 16_384,
    description: "State excluded by the compatibility rule.",
  }),
  why: Type.String({
    minLength: 1,
    maxLength: 16_384,
    description: "Reason the compatibility rule exists.",
  }),
  remediate: Type.String({
    minLength: 1,
    maxLength: 16_384,
    description: "Operator remediation for one finding.",
  }),
  message: RuleMessageSchema,
  pathCoverage: Type.Array(CompatibilityPathCoverageSchema, {
    minItems: 1,
    maxItems: 1,
    description: "Single exact-path cache boundary for the compatibility rule.",
  }),
  supportFiles: CompatibilitySupportFilesSchema,
} as const;

const CompatibilityGritRuleSourceSchema = Type.Object(
  {
    ...CompatibilityRuleSourceCommon,
    hookCheck: Type.Literal(true, {
      description: "The legacy hook executes this Grit check.",
    }),
    runner: CompatibilityGritRunnerSourceSchema,
  },
  { additionalProperties: false, description: "Supported legacy Grit rule source." }
);

const CompatibilityStructureRuleSourceSchema = Type.Object(
  {
    ...CompatibilityRuleSourceCommon,
    runner: CompatibilityStructureRunnerSourceSchema,
  },
  { additionalProperties: false, description: "Supported legacy structure rule source." }
);

const ResolvedCompatibilityGritRunnerSchema = Type.Object(
  {
    name: Type.Literal("grit", { description: "Grit runner identity." }),
    pattern: ResolvedRuleAssetSchema,
    patternName: PatternNameSchema,
    acquisition: Type.Object(
      {
        kind: Type.Literal("check", { description: "Resolved compatibility operation." }),
        entries: Type.Array(
          Type.Object(
            {
              kind: PathKindSchema,
              path: RelativePathSchema,
            },
            { additionalProperties: false, description: "Resolved compatibility subject root." }
          ),
          {
            minItems: 1,
            description: "Concrete compatibility roots in declared order.",
          }
        ),
      },
      { additionalProperties: false, description: "Resolved compatibility Grit acquisition." }
    ),
  },
  { additionalProperties: false, description: "Resolved compatibility Grit runner." }
);

const ResolvedCompatibilityStructureRunnerSchema = Type.Object(
  {
    name: Type.Literal("habitat", { description: "Native Habitat runner identity." }),
    mode: Type.Literal("structure", { description: "Native structure evaluation mode." }),
    structure: ResolvedRuleAssetSchema,
  },
  { additionalProperties: false, description: "Resolved compatibility structure runner." }
);

const CompatibilityRuleSchema = Type.Object(
  {
    ruleId: IdSchema,
    ownerProject: ProjectIdSchema,
    manifestPath: RelativePathSchema,
    lane: Type.Literal("enforced", { description: "Compatibility rule policy lane." }),
    message: RuleMessageSchema,
    remediate: RuleRemediationSchema,
    provenance: LocalAuthorityProvenanceSchema,
    coveragePatterns: Type.Array(Type.String({ minLength: 1, maxLength: 4_096 }), {
      minItems: 1,
      uniqueItems: true,
      description: "Repository path patterns that define compatibility subjects and cache inputs.",
    }),
    baseline: ResolvedRuleAssetSchema,
    runner: Type.Union(
      [ResolvedCompatibilityStructureRunnerSchema, ResolvedCompatibilityGritRunnerSchema],
      { description: "Resolved compatibility runner and its concrete assets." }
    ),
  },
  { additionalProperties: false, description: "One executable version 2 compatibility rule." }
);

/** Closed compatibility index source schema. */
export const CompatibilityIndexSchema = Type.Object(
  {
    $comment: Type.Optional(Type.String({ description: "Optional legacy index comment." })),
    schemaVersion: Type.Literal(2, { description: "Legacy registry schema version." }),
    ownerRoots: Type.Record(ProjectIdSchema, RelativePathSchema, {
      minProperties: 1,
      description: "Legacy owner roots keyed by project identity.",
    }),
  },
  { additionalProperties: false, description: "Legacy version 2 registry index." }
);

/** Closed admission schema for the exact executable legacy rule subset. */
export const CompatibilityRuleSourceSchema = Type.Union(
  [CompatibilityGritRuleSourceSchema, CompatibilityStructureRuleSourceSchema],
  { description: "Supported version 2 compatibility rule source." }
);

/** Closed empty baseline admitted during compatibility resolution. */
export const CompatibilityBaselineSchema = Type.Array(Type.Never(), {
  maxItems: 0,
  description: "Empty compatibility baseline; every observed finding remains live.",
});

const CompatibilityCatalogSchema = Type.Object(
  {
    schemaVersion: Type.Literal(2, { description: "Legacy compatibility catalog version." }),
    ownerRoots: Type.Record(ProjectIdSchema, RelativePathSchema, {
      description: "Validated legacy owner roots keyed by project identity.",
    }),
    rules: Type.Array(CompatibilityRuleSchema, {
      description: "Resolved executable compatibility rules in stable identity order.",
    }),
  },
  { additionalProperties: false, description: "Version 2 compatibility rule catalog." }
);

const ResolvedPolicyPackSchema = Type.Object(
  {
    name: PackageNameSchema,
    version: PackageVersionSchema,
    protocolVersion: Type.Literal(1, {
      description: "Admitted policy-pack protocol version.",
    }),
    blueprints: Type.Array(PolicyPackBlueprintMemberSchema, {
      description: "Admitted blueprint members in manifest order.",
    }),
  },
  { additionalProperties: false, description: "One admitted selected policy pack." }
);

const HabitatCatalogSchema = Type.Object(
  {
    schemaVersion: Type.Literal(3, { description: "Resolved authority catalog version." }),
    policyPack: ResolvedPolicyPackSchema,
    blueprints: Type.Array(BlueprintDefinitionRecordSchema, {
      description: "Admitted local blueprints in stable identity/version order.",
    }),
    instances: Type.Array(ResolvedBlueprintInstanceSchema, {
      description: "Resolved instances in stable identity order.",
    }),
    applications: Type.Array(ResolvedRuleApplicationSchema, {
      description: "Resolved applications in stable rule/instance order.",
    }),
    compatibility: CompatibilityCatalogSchema,
  },
  { additionalProperties: false, description: "Complete local Habitat authority catalog." }
);

/** Closed empty request; the service owns repository authority enumeration. */
export const ResolveCatalogInputSchema = Type.Object(
  {},
  { additionalProperties: false, description: "Catalog resolution request." }
);

/** Closed stable issue schema returned for expected admission failures. */
export const CatalogIssueSchema = Type.Object(
  {
    code: CatalogIssueCodeSchema,
    path: Type.String({ maxLength: 4_096, description: "Source or repository path at fault." }),
    message: Type.String({ minLength: 1, maxLength: 8_192, description: "Bounded issue detail." }),
  },
  { additionalProperties: false, description: "One expected catalog admission issue." }
);

/** Closed resolved/rejected result union for catalog resolution. */
export const ResolveCatalogResultSchema = Type.Union(
  [
    Type.Object(
      {
        _tag: Type.Literal("Resolved", { description: "Successful resolution discriminant." }),
        catalog: HabitatCatalogSchema,
      },
      { additionalProperties: false, description: "Successfully resolved catalog result." }
    ),
    Type.Object(
      {
        _tag: Type.Literal("Rejected", { description: "Rejected resolution discriminant." }),
        issues: Type.Array(CatalogIssueSchema, {
          minItems: 1,
          maxItems: MAX_CATALOG_ISSUES,
          description: "Bounded stable admission issues.",
        }),
      },
      { additionalProperties: false, description: "Expected rejected catalog result." }
    ),
  ],
  { description: "Resolved or rejected Habitat catalog outcome." }
);

/** One admitted blueprint definition document. */
export type BlueprintDefinition = Static<typeof BlueprintDefinitionSchema>;

/** Selected npm package metadata admitted for a policy pack. */
export type PolicyPackPackageJson = Static<typeof PolicyPackPackageJsonSchema>;

/** Closed selected policy-pack protocol manifest. */
export type PolicyPackManifest = Static<typeof PolicyPackManifestSchema>;

/** One admitted local instance manifest document. */
export type HabitatInstanceManifest = Static<typeof HabitatInstanceManifestSchema>;

/** One validated inert compatibility index. */
export type CompatibilityIndex = Static<typeof CompatibilityIndexSchema>;

/** One validated executable compatibility rule source. */
export type CompatibilityRuleSource = Static<typeof CompatibilityRuleSourceSchema>;

/** Empty admitted compatibility baseline. */
export type CompatibilityBaseline = Static<typeof CompatibilityBaselineSchema>;

/** Caller request for one catalog resolution. */
export type ResolveCatalogInput = Static<typeof ResolveCatalogInputSchema>;

/** Public resolved/rejected catalog outcome. */
export type ResolveCatalogResult = Static<typeof ResolveCatalogResultSchema>;

/** One bounded stable catalog issue. */
export type CatalogIssue = Static<typeof CatalogIssueSchema>;

/** Successful catalog payload extracted from the public result union. */
export type HabitatCatalog = Extract<ResolveCatalogResult, { _tag: "Resolved" }>["catalog"];
