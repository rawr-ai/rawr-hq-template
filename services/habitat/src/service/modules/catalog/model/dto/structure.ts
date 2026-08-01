import picomatch from "picomatch";
import { type Static, Type } from "typebox";

/** Glob options shared by schema admission and native structure evaluation. */
export const STRUCTURE_PICOMATCH_OPTIONS: Readonly<picomatch.PicomatchOptions> = Object.freeze({
  contains: false,
  dot: true,
  strictBrackets: true,
});

const RootRoleSchema = Type.String({
  minLength: 1,
  maxLength: 200,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
  description: "Blueprint root role used as the base for one structure scope.",
});

const RootRelativePatternSchema = Type.Refine(
  Type.String({
    minLength: 1,
    maxLength: 4_096,
    description: "Safe root-relative path or glob selecting structure roots.",
  }),
  isSafeRootRelativePattern,
  () => "Expected a safe, valid root-relative path or glob"
);

const DirectChildPatternSchema = Type.Refine(
  Type.String({
    minLength: 1,
    maxLength: 1_024,
    description: "Glob matched against one direct child name.",
  }),
  isSafeDirectChildPattern,
  () => "Expected a safe, valid direct-child glob"
);

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

const StructureDocumentShapeSchema = Type.Object(
  {
    schemaVersion: Type.Literal(2, { description: "Structure document schema version." }),
    scopes: Type.Array(StructureScopeSchema, {
      minItems: 1,
      description: "Structure scopes evaluated in declared order.",
    }),
  },
  { additionalProperties: false, description: "Closed Habitat structure document." }
);

type StructureDocumentShape = Static<typeof StructureDocumentShapeSchema>;

/** Sole structural authority for one version-two Habitat structure document. */
export const StructureDocumentSchema = Type.Refine(
  StructureDocumentShapeSchema,
  hasUniqueScopeNames,
  () => "Expected unique structure scope names"
);

const CompatibilityStructureDocumentShapeSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1, { description: "Compatibility structure schema version." }),
    scopes: Type.Array(CompatibilityStructureScopeSchema, {
      minItems: 1,
      description: "Compatibility structure scopes evaluated in declared order.",
    }),
  },
  { additionalProperties: false, description: "Closed compatibility structure document." }
);

type CompatibilityStructureDocumentShape = Static<typeof CompatibilityStructureDocumentShapeSchema>;

/** Sole structural authority for one version-one compatibility structure document. */
export const CompatibilityStructureDocumentSchema = Type.Refine(
  CompatibilityStructureDocumentShapeSchema,
  hasUniqueCompatibilityScopeNames,
  () => "Expected unique compatibility structure scope names"
);

/** Schema-admitted version-two Habitat structure document. */
export type StructureDocument = Static<typeof StructureDocumentSchema>;

/** One schema-admitted structure scope. */
export type StructureScope = StructureDocument["scopes"][number];

/** Schema-admitted version-one compatibility structure document. */
export type CompatibilityStructureDocument = Static<typeof CompatibilityStructureDocumentSchema>;

/** One schema-admitted version-one compatibility structure scope. */
export type CompatibilityStructureScope = CompatibilityStructureDocument["scopes"][number];

function hasUniqueScopeNames(document: StructureDocumentShape): boolean {
  return new Set(document.scopes.map((scope) => scope.name)).size === document.scopes.length;
}

function hasUniqueCompatibilityScopeNames(document: CompatibilityStructureDocumentShape): boolean {
  return new Set(document.scopes.map((scope) => scope.name)).size === document.scopes.length;
}

function isSafeRootRelativePattern(value: string): boolean {
  if (!isValidGlob(value)) return false;
  if (value === ".") return true;
  return (
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    !/^[A-Za-z]:\//u.test(value) &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function isSafeDirectChildPattern(value: string): boolean {
  return (
    isValidGlob(value) &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function isValidGlob(value: string): boolean {
  try {
    picomatch(value, STRUCTURE_PICOMATCH_OPTIONS);
    return true;
  } catch {
    return false;
  }
}
