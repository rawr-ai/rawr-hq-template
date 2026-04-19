/**
 * @fileoverview Reserved config-module schema anchors.
 *
 * @remarks
 * This file reserves the canonical module-local schema slot without moving
 * configuration truth into the package yet.
 */
import { type Static, Type } from "typebox";

export const ConfigReservationSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description: "Reserved placeholder schema for the HQ Ops config module.",
  },
);

export type ConfigReservation = Static<typeof ConfigReservationSchema>;
