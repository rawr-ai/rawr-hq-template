/**
 * @fileoverview Reserved journal-module schema anchors.
 *
 * @remarks
 * This file reserves the canonical module-local schema slot without moving
 * journal truth into the package yet.
 */
import { type Static, Type } from "typebox";

export const JournalReservationSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description: "Reserved placeholder schema for the HQ Ops journal module.",
  },
);

export type JournalReservation = Static<typeof JournalReservationSchema>;
