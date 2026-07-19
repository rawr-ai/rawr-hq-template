import { Refine, Type } from "typebox";

import {
  CURRENT_MAIN_V2_PROTOCOL,
  CurrentMainBodyV2Schema,
  CurrentMainEnvelopeV2Schema,
  CurrentMainSelectionResultSchema,
  MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES,
  type CanonicalCurrentMainV2,
  type CurrentMainV2CodecResult,
} from "./model/dto/current-main";

const RepositoryIdentitySchema = Type.String({ minLength: 1, maxLength: 512 });
const CurrentMainV2DigestSchema = Type.String({ pattern: "^cm2_[0-9a-f]{64}$" });
const Uint8ArraySchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array",
);

export const GitLocatorSchema = Type.Object(
  {
    workspacePath: Type.String({ minLength: 1 }),
    expectedRepositoryIdentity: RepositoryIdentitySchema,
  },
  { additionalProperties: false },
);

export const CurrentMainSelectionInputSchema = Type.Object(
  { locator: GitLocatorSchema },
  { additionalProperties: false },
);

export const CurrentMainRecordInputSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("encode-body"),
      body: CurrentMainBodyV2Schema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("validate-envelope"),
      bytes: Uint8ArraySchema,
    },
    { additionalProperties: false },
  ),
]);

export type CurrentMainRecordProcedureResult = CurrentMainV2CodecResult<CanonicalCurrentMainV2>;

export const CurrentMainRecordResultSchema = Type.Unsafe<CurrentMainRecordProcedureResult>(Type.Union([
  Type.Object(
    {
      ok: Type.Literal(true),
      value: Type.Object(
        {
          protocol: Type.Literal(CURRENT_MAIN_V2_PROTOCOL),
          currentMainDigest: CurrentMainV2DigestSchema,
          byteLength: Type.Integer({ minimum: 1, maximum: MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES }),
          bytes: Uint8ArraySchema,
          record: CurrentMainEnvelopeV2Schema,
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ok: Type.Literal(false),
      failure: Type.Object(
        {
          code: Type.Union([
            Type.Literal("InvalidSchema"),
            Type.Literal("EnvelopeTooLarge"),
            Type.Literal("DigestMismatch"),
            Type.Literal("NonCanonical"),
          ]),
          path: Type.String({ minLength: 1 }),
          message: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
]));

export { CurrentMainSelectionResultSchema };
export type { GitLocatorInput } from "./model/dto/boundary";
