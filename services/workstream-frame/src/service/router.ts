/**
 * @fileoverview Service router composition for workstream-frame.
 *
 * @remarks
 * Composes module routers into one router object with a single final attach.
 * Service-wide middleware is authored in `src/service/impl.ts`.
 */
import { impl } from "./impl";
import { router as revisions } from "./modules/revisions/router";
import { router as streams } from "./modules/streams/router";

/** Contract-enforced service router; drifts fail typecheck. */
export const router = impl.router({
  streams,
  revisions,
});

export type Router = typeof router;
