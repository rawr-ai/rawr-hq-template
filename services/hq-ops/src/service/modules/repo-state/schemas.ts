/**
 * @fileoverview Reserved repo-state-module schema anchors.
 *
 * @remarks
 * This file reserves the canonical module-local schema slot without moving
 * repo-state truth into the package yet.
 */
import { type Static, Type } from "typebox";

export const RepoStateReservationSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description: "Reserved placeholder schema for the HQ Ops repo-state module.",
  },
);

export type RepoStateReservation = Static<typeof RepoStateReservationSchema>;
