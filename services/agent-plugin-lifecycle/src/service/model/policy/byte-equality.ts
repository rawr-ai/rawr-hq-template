/**
 * Compares byte sequences by length and complete content.
 *
 * Canonical record policy uses this mechanic after decoding to distinguish an
 * equivalent value from its one admitted serialized representation.
 *
 * @param left First byte sequence.
 * @param right Second byte sequence.
 * @returns Whether both sequences have identical length and content.
 */
export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}
