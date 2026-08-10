import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";
import type { Static, TSchema } from "typebox";
import { Validator } from "typebox/schema";
import { Clone } from "typebox/value";

export type {
  RuntimeRedactedShape,
  RuntimeRedactionPolicy,
  RuntimeSchema as RuntimeSchemaContract,
  RuntimeSchemaIssue,
  RuntimeSchemaResult,
  RuntimeSchemaValue,
} from "./runtime-schema";
export { RuntimeSchema } from "./runtime-schema";

/** Standard validation and JSON Schema projections for one TypeBox schema. */
export type TypeBoxStandardSchema<TypeSchema extends TSchema> = StandardSchemaV1<
  Static<TypeSchema>,
  Static<TypeSchema>
> &
  StandardJSONSchemaV1<Static<TypeSchema>, Static<TypeSchema>>;

/**
 * Adapts one TypeBox schema to the Standard Schema protocols.
 *
 * @remarks
 * Construction captures one detached schema for validation and projection.
 * TypeBox 1.3.8 does not expose reconstructable issue paths, so validation
 * failures deliberately contain messages only.
 */
export function standard<const TypeSchema extends TSchema>(
  schema: TypeSchema
): TypeBoxStandardSchema<TypeSchema> {
  const validator = new Validator({}, Clone(schema));

  const jsonSchema = ({ target }: StandardJSONSchemaV1.Options) => {
    if (target !== "draft-2020-12") {
      throw new TypeError(`Unsupported JSON Schema target: ${target}`);
    }

    // TSchema is an object-form JSON Schema, but its type omits the string
    // index signature required by the Standard JSON Schema interface.
    return Clone(validator.Schema()) as unknown as Record<string, unknown>;
  };

  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate(value: unknown): StandardSchemaV1.Result<Static<TypeSchema>> {
        if (validator.Check(value)) {
          return { value };
        }

        const [, errors] = validator.Errors(value);
        return {
          issues: errors.map(({ message }) => ({ message })),
        };
      },
      jsonSchema: {
        input: jsonSchema,
        output: jsonSchema,
      },
    },
  };
}
