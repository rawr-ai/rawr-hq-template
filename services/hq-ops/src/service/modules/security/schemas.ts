/**
 * @fileoverview Reserved security-module schema anchors.
 *
 * @remarks
 * This file reserves the canonical module-local schema slot without moving
 * security truth into the package yet.
 */
import { type Static, Type } from "typebox";

export const SecurityReservationSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description: "Reserved placeholder schema for the HQ Ops security module.",
  },
);

export type SecurityReservation = Static<typeof SecurityReservationSchema>;
