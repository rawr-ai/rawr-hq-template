import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "./primitives";

export type PayloadByteTotal =
  | Readonly<{ ok: true; value: number }>
  | Readonly<{ ok: false }>;

export function addReleaseSetPayloadBytes(current: number, additional: number): PayloadByteTotal {
  if (
    !Number.isSafeInteger(current)
    || current < 0
    || !Number.isSafeInteger(additional)
    || additional < 0
  ) {
    return { ok: false };
  }
  const value = current + additional;
  return Number.isSafeInteger(value) && value <= MAX_RELEASE_SET_PAYLOAD_BYTES
    ? { ok: true, value }
    : { ok: false };
}
