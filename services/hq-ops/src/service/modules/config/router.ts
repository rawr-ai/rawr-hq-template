/**
 * @fileoverview Config module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * U02 is reservation-only, so this module exports one structural reservation
 * procedure rather than live config behavior.
 */
import { module } from "./module";

const reservation = module.reservation.handler(async ({ context }) => {
  return context.repo.reservation;
});

/** Contract-enforced module router reserved for later config procedures. */
export const router = module.router({
  reservation,
});
