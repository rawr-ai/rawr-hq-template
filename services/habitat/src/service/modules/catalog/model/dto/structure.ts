import { type Static, Type } from "typebox";

const RootRoleSchema = Type.String({
  minLength: 1,
  maxLength: 200,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
  description: "Blueprint root role used as the base for one structure scope.",
});

const RootRelativePatternSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  description: "Safe root-relative path or glob selecting structure roots.",
});

const DirectChildPatternSchema = Type.String({
  minLength: 1,
  maxLength: 1_024,
  description: "Glob matched against one direct child name.",
});

const StructureScopeSchema = Type.Object(
  {
    name: Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Stable identity for one structure scope.",
    }),
    rootRole: RootRoleSchema,
    relativePath: RootRelativePatternSchema,
    kind: Type.Union([Type.Literal("directory"), Type.Literal("file")], {
      description: "Expected kind for every matched scope root.",
    }),
    mode: Type.Union([Type.Literal("open"), Type.Literal("closed")], {
      description: "Whether unmatched direct children are admitted.",
    }),
    allowEmpty: Type.Optional(
      Type.Boolean({ description: "Whether a scope may match no visible roots." })
    ),
    required: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs that must each match at least one child.",
      })
    ),
    allowed: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs admitted by a closed scope.",
      })
    ),
    forbidden: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs rejected in every scope mode.",
      })
    ),
  },
  { additionalProperties: false, description: "One closed Habitat structure scope." }
);

const CompatibilityStructureScopeSchema = Type.Object(
  {
    name: Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Stable identity for one compatibility structure scope.",
    }),
    root: RootRelativePatternSchema,
    kind: Type.Union([Type.Literal("directory"), Type.Literal("file")], {
      description: "Expected kind for every matched scope root.",
    }),
    mode: Type.Union([Type.Literal("open"), Type.Literal("closed")], {
      description: "Whether unmatched direct children are admitted.",
    }),
    allowEmpty: Type.Optional(
      Type.Boolean({ description: "Whether a scope may match no visible roots." })
    ),
    required: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs that must each match at least one child.",
      })
    ),
    allowed: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs admitted by a closed scope.",
      })
    ),
    forbidden: Type.Optional(
      Type.Array(DirectChildPatternSchema, {
        uniqueItems: true,
        description: "Unique direct-child globs rejected in every scope mode.",
      })
    ),
  },
  { additionalProperties: false, description: "One closed compatibility structure scope." }
);

/** Sole structural authority for one version-two Habitat structure document. */
export const StructureDocumentSchema = Type.Object(
  {
    schemaVersion: Type.Literal(2, { description: "Structure document schema version." }),
    scopes: Type.Array(StructureScopeSchema, {
      minItems: 1,
      description: "Structure scopes evaluated in declared order.",
    }),
  },
  { additionalProperties: false, description: "Closed Habitat structure document." }
);

/** Sole structural authority for one version-one compatibility structure document. */
export const CompatibilityStructureDocumentSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1, { description: "Compatibility structure schema version." }),
    scopes: Type.Array(CompatibilityStructureScopeSchema, {
      minItems: 1,
      description: "Compatibility structure scopes evaluated in declared order.",
    }),
  },
  { additionalProperties: false, description: "Closed compatibility structure document." }
);

/** Structurally validated version-two Habitat structure document. */
export type StructureDocument = Static<typeof StructureDocumentSchema>;

/** One structurally validated version-two structure scope. */
export type StructureScope = StructureDocument["scopes"][number];

/** Structurally validated version-one compatibility structure document. */
export type CompatibilityStructureDocument = Static<typeof CompatibilityStructureDocumentSchema>;

/** One structurally validated version-one compatibility structure scope. */
export type CompatibilityStructureScope = CompatibilityStructureDocument["scopes"][number];
