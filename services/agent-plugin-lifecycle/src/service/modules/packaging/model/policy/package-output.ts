const PACKAGING_PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES = 64 * 1024 * 1024;

/**
 * Selects the bounded prior-output observation limit for one rendered package.
 *
 * Packaging owns this settlement choice independently from release payload
 * bounds; the rendered byte length raises the floor when the package is larger.
 */
export function priorOutputObservationLimit(renderedByteLength: number): number {
  return Math.max(renderedByteLength, PACKAGING_PRIOR_OUTPUT_OBSERVATION_FLOOR_BYTES);
}
