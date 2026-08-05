import { MAX_PACKAGING_OUTPUT_PATH_LENGTH } from "../dto/packaging-lifecycle";

const PACKAGING_PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES = 64 * 1024 * 1024;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;
const encoder = new TextEncoder();

/** Admits the caller-selected package destination before source or output access. */
export function isCanonicalPackageOutputPath(value: string): boolean {
  return (
    value !== "/" &&
    value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("//") &&
    !value.includes("\\") &&
    value.normalize("NFC") === value &&
    !controlCharacterPattern.test(value) &&
    !value.split("/").some((segment) => segment === "." || segment === "..") &&
    encoder.encode(value).byteLength <= MAX_PACKAGING_OUTPUT_PATH_LENGTH
  );
}

/**
 * Selects the bounded prior-output observation limit for one rendered package.
 *
 * Packaging owns this settlement choice independently from release payload
 * bounds; the rendered byte length raises the floor when the package is larger.
 */
export function priorOutputObservationLimit(renderedByteLength: number): number {
  return Math.max(renderedByteLength, PACKAGING_PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES);
}
