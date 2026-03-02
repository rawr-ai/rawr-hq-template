/**
 * @fileoverview Shared middleware builder for package-global middleware.
 *
 * @remarks
 * Middleware files should build from this shared `base` value so context
 * dependency declarations stay centralized and consistent.
 */
import { os } from "@orpc/server";
import type { BaseContext } from "../context";

export const base = os.$context<BaseContext>();
