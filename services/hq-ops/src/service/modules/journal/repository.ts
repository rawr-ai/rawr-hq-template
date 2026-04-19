/**
 * @fileoverview Journal module repository seam (placeholder).
 *
 * @remarks
 * U02 is reservation-only, so this repository exposes only a structural
 * placeholder return shape. Real journal persistence logic arrives in later
 * slices.
 */
import type { JournalReservation } from "./schemas";

export function createRepository() {
  const reservation: JournalReservation = {};
  return {
    reservation,
  };
}
