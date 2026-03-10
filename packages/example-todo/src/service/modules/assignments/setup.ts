/**
 * @fileoverview Assignments module runtime setup.
 *
 * @remarks
 * This file owns module setup only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - export configured `os` for handler implementations
 */
import { impl } from "../../impl";
import { repositories } from "./middleware";

/**
 * SECTION: Module Setup (Always Present)
 *
 * Keep module-wide setup here so procedure handlers can stay focused on business logic.
 */
export const os = impl.assignments.use(repositories);
