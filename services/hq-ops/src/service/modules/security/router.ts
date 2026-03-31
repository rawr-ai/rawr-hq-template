/**
 * @fileoverview Security module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * U02 is reservation-only, so this module exports one structural reservation
 * procedure rather than live security behavior.
 */
import { module } from "./module";

const reservation = module.reservation.handler(async ({ context }) => {
  return context.repo.reservation;
});

/** Contract-enforced module router reserved for later security procedures. */
export const router = module.router({
  reservation,
});
