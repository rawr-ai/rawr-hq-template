import type { Schema, SchemaIssue } from "@orpc/contract";
import { createRouterClient, type AnyRouter, type InferRouterInitialContext, type RouterClient } from "@orpc/server";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

function decodePathSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;

  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodePathSegment(segment))
    .map((segment) => (/^\d+$/u.test(segment) ? Number(segment) : segment));

  return segments.length > 0 ? segments : undefined;
}

export function typeBoxStandardSchema<T extends TSchema>(typeboxSchema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(typeboxSchema, value)) {
          return { value: value as Static<T> };
        }

        const issues = [...Value.Errors(typeboxSchema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });

        return {
          issues: issues.length > 0 ? issues : [{ message: "Validation failed" }],
        };
      },
    },
    __typebox: typeboxSchema,
  } as Schema<Static<T>, Static<T>>;
}

export function schema<T extends TSchema>(typeboxSchema: T): Schema<Static<T>, Static<T>> {
  return typeBoxStandardSchema(typeboxSchema);
}

/**
 * Extracts the canonical dependency bag type from an oRPC router that expects
 * initial context shaped as `{ deps: ... }`.
 */
export type InferDomainDeps<TRouter extends AnyRouter> =
  InferRouterInitialContext<TRouter> extends { deps: infer TDeps } ? TDeps : never;

/**
 * Shared descriptor for internal domain packages consumed in-process.
 *
 * All packages using this helper expose the same bootstrap surface:
 * `domain.createClient(deps)` -> `createRouterClient(router, { context: { deps } })`.
 */
export interface InProcessDomainPackage<TRouter extends AnyRouter> {
  readonly router: TRouter;
  createClient(deps: InferDomainDeps<TRouter>): RouterClient<TRouter>;
}

export function defineInProcessDomainPackage<TRouter extends AnyRouter>(
  router: TRouter,
): InProcessDomainPackage<TRouter> {
  return {
    router,
    createClient(deps) {
      return createRouterClient(router, {
        context: { deps } as InferRouterInitialContext<TRouter>,
      });
    },
  };
}
