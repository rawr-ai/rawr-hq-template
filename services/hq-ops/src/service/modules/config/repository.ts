/**
 * @fileoverview Config module repository seam (placeholder).
 *
 * @remarks
 * U02 is reservation-only, so this repository exposes only a structural
 * placeholder return shape. Real config persistence logic arrives in later
 * slices.
 */
import type { ConfigReservation } from "./schemas";

export function createRepository() {
  const reservation: ConfigReservation = {};
  return {
    reservation,
  };
}
