/**
 * @fileoverview Root ORPC builder for package router composition.
 *
 * @remarks
 * Keep this file intentionally small. It defines only the initial package
 * context shape for routers in this package.
 *
 * @agents
 * Do not add aliasing middleware here just to rename fields from `deps`.
 * Use package-level middleware only for real runtime concerns (auth, tracing,
 * tenant resolution, transaction scope, request IDs).
 */
import { os } from "@orpc/server";
import type { BaseContext } from "./context";

export const base = os.$context<BaseContext>();
