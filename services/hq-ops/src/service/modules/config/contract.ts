/**
 * @fileoverview Config-module boundary contract.
 *
 * @remarks
 * U02 is reservation-only. This file reserves the module boundary anchor with a
 * single structural reservation procedure so the package keeps the canonical
 * contract-first service shell.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { ConfigReservationSchema } from "./schemas";

const ReservationInputSchema = schema(
  Type.Object(
    {},
    {
      additionalProperties: false,
      description: "No caller input is required for the config reservation placeholder.",
    },
  ),
);

export const contract = {
  reservation: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(ReservationInputSchema)
    .output(schema(ConfigReservationSchema)),
};
