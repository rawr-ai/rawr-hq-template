/**
 * @fileoverview Repo-state module repository seam (placeholder).
 *
 * @remarks
 * U02 is reservation-only, so this repository exposes only a structural
 * placeholder return shape. Real repo-state persistence logic arrives in later
 * slices.
 */
import type { RepoStateReservation } from "./schemas";

export function createRepository() {
  const reservation: RepoStateReservation = {};
  return {
    reservation,
  };
}
