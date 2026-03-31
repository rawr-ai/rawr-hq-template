/**
 * @fileoverview Security module repository seam (placeholder).
 *
 * @remarks
 * U02 is reservation-only, so this repository exposes only a structural
 * placeholder return shape. Real security persistence logic arrives in later
 * slices.
 */
import type { SecurityReservation } from "./schemas";

export function createRepository() {
  const reservation: SecurityReservation = {};
  return {
    reservation,
  };
}
