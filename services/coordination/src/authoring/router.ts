/**
 * @fileoverview Authoring convenience router for `@rawr/coordination/authoring`.
 *
 * @remarks
 * This is a package-edge convenience only. The authoritative workflow
 * procedures remain the canonical `workflows` subtree on `../service/router`.
 */
import { router as serviceRouter } from "../service/router";

export const router = serviceRouter.workflows;
export type Router = typeof router;
