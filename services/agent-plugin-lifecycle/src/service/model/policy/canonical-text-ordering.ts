const encoder = new TextEncoder();

/**
 * Orders release-wide text by its canonical UTF-8 byte representation.
 *
 * Release records use this policy wherever deterministic ordering must remain
 * independent of JavaScript's UTF-16 string comparison.
 */
export function compareCanonicalText(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.length - rightBytes.length;
}
