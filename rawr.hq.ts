/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style transitional composition bridge
 * @agents-must-not runtime/testing/OpenAPI executable authority
 *
 * Owns:
 * - a narrow explicit bridge for HQ composition input while the host-cutover
 *   slice removes direct runtime-role imports from `@rawr/hq-app/*`
 *
 * Must not own:
 * - runtime-role executable authority
 * - host binding or request/process materialization
 *
 * Canonical:
 * - `apps/hq/src/manifest.ts` remains the declaration authority
 *
 * Transitional:
 * - server-owned host surfaces may consume this re-export as composition input
 *   while Milestone 4 stays open
 */
export { createRawrHqManifest, type RawrHqManifest } from "@rawr/hq-app/manifest";
