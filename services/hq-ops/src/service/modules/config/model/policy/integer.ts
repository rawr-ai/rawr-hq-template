/** Truncates and bounds a number to an inclusive integer range. */
export function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
