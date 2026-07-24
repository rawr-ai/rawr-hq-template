import { type Static, Type } from "typebox";

/** Canonical branch whose reviewed record selects Personal content. */
export const CURRENT_MAIN_V3_CANONICAL_REF = "refs/heads/main" as const;

/** Repository-owned location of the reviewed current-main selection. */
export const CURRENT_MAIN_V3_RECORD_PATH =
  ".rawr/agent-plugin-lifecycle/channels/current-main.json" as const;

/** Repository-owned release input selected by the current-main record. */
export const CURRENT_MAIN_V3_RELEASE_INPUT_PATH = ".rawr/release-input.json" as const;

/** Maximum bytes admitted for one reviewed current-main record. */
export const MAX_CURRENT_MAIN_V3_RECORD_BYTES = 2 * 1024 * 1024;

/** Shared validation outcomes used by selection and the governance operation. */
export const CurrentMainRecordValidationCodeSchema = Type.Union([
  Type.Literal("InvalidSchema"),
  Type.Literal("RecordTooLarge"),
  Type.Literal("NonCanonical"),
]);

export type CurrentMainRecordValidationCode = Static<typeof CurrentMainRecordValidationCodeSchema>;
