/**
 * @fileoverview Deterministic identity for peeled-off items.
 */

/**
 * Build the id for the item peeled off when a boundary refuses its parent.
 *
 * @remarks
 * Deterministic on purpose: repeated pushes against the same unmet requirement
 * address the same derived item instead of forking duplicates.
 *
 * @param parentId - Item the boundary refused.
 * @param requires - Tag the boundary demanded.
 */
export function derivedItemId(parentId: string, requires: string): string {
  return `${parentId}~needs-${requires.replace(/[^A-Za-z0-9._-]/gu, "-")}`;
}
