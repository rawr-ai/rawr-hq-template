import type { Middleware, MiddlewareOptions, MiddlewareOutputFn, MiddlewareResult } from "@orpc/server";

import type { BaseMetadata } from "../baseline/types";
import type { ProvidedContext, ReservedContextKey } from "../context/types";

type CreateMiddlewareBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  baseMetadata: BaseMetadata;
};

type MaybePromise<T> = T | Promise<T>;

/**
 * Reject output objects that try to overlap reserved context keys.
 */
type NonReservedOutput<T extends object> =
  Extract<keyof T, ReservedContextKey> extends never ? T : never;

type ExistingProvided<TContext extends object> =
  TContext extends { provided: infer TProvided extends object } ? TProvided : {};

type NonOverlappingProvided<
  TContext extends object,
  TAdded extends object,
> = Extract<keyof ExistingProvided<TContext>, keyof TAdded> extends never ? TAdded : never;

type MergeProvided<
  TContext extends object,
  TAdded extends object,
> = ProvidedContext<ExistingProvided<TContext> & TAdded>;

type AuthoringOptions<
  TInContext extends object,
  TMeta extends BaseMetadata,
> = Omit<MiddlewareOptions<TInContext, any, any, TMeta>, "next">;

type NormalMiddlewareCallback<
  TInContext extends object,
  TMeta extends BaseMetadata,
> = (
  options: AuthoringOptions<TInContext, TMeta> & {
    next(): MiddlewareResult<Record<never, never>, any>;
  },
  input: unknown,
  output: MiddlewareOutputFn<unknown>,
) => MaybePromise<MiddlewareResult<Record<never, never>, any>>;

type ProviderCallback<
  TInContext extends object,
  TAdded extends object,
  TMeta extends BaseMetadata,
> = (
  options: AuthoringOptions<TInContext, TMeta> & {
    next(
      provided: NonReservedOutput<NonOverlappingProvided<TInContext, TAdded>>,
    ): MiddlewareResult<MergeProvided<TInContext, TAdded>, unknown>;
  },
  input: unknown,
  output: MiddlewareOutputFn<unknown>,
) => MaybePromise<MiddlewareResult<MergeProvided<TInContext, TAdded>, unknown>>;

function assertNoProvidedKeyCollisions(
  currentProvided: object,
  nextProvided: object,
  builderKind: "shared" | "service",
) {
  const overlappingKeys = Object.keys(nextProvided).filter((key) =>
    Object.prototype.hasOwnProperty.call(currentProvided, key),
  );

  if (overlappingKeys.length === 0) {
    return;
  }

  throw new Error(
    `${builderKind} provider attempted to overwrite existing provided keys: ${overlappingKeys.join(", ")}`,
  );
}

/**
 * Create a middleware builder for guards/observers that must not add context.
 */
export function createNormalMiddlewareBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return {
    middleware(callback: NormalMiddlewareCallback<TRequiredContext, TMeta>) {
      const middleware: Middleware<
        TRequiredContext,
        Record<never, never>,
        any,
        any,
        any,
        TMeta
      > = (middlewareOptions, input, output) => {
        return callback({
          ...middlewareOptions,
          next: () => middlewareOptions.next(),
        }, input, output);
      };

      return middleware;
    },
  };
}

function createProviderBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  _options: CreateMiddlewareBuilderOptions<TMeta>,
  builderKind: "shared" | "service",
) {
  return {
    middleware<TAdded extends object>(
      callback: ProviderCallback<TRequiredContext, TAdded, TMeta>,
    ) {
      const middleware: Middleware<
        TRequiredContext,
        MergeProvided<TRequiredContext, TAdded>,
        unknown,
        unknown,
        any,
        TMeta
      > = (middlewareOptions, input, output) => {
        return callback({
          ...middlewareOptions,
          next: (provided) => {
            const currentProvided = (middlewareOptions.context as { provided?: object }).provided ?? {};
            assertNoProvidedKeyCollisions(currentProvided, provided, builderKind);

            // oRPC correctly merges the nested execution context here, but TS does not
            // preserve the widened `provided` bag through `middlewareOptions.next(...)`.
            // Keep the cast local to this seam and pin the behavior with tests.
            return middlewareOptions.next({
              context: {
                provided: {
                  ...currentProvided,
                  ...provided,
                },
              },
            }) as unknown as MiddlewareResult<MergeProvided<TRequiredContext, TAdded>, unknown>;
          },
        }, input, output);
      };

      return middleware;
    },
  };
}

/**
 * Create a provider builder for reusable/shared middleware.
 *
 * @remarks
 * Shared providers may only add context under `provided`.
 */
export function createSharedProviderBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return createProviderBuilder<TRequiredContext, TMeta>(options, "shared");
}

/**
 * Create a provider builder for service-local execution context additions.
 *
 * @remarks
 * Service-local providers also write under `provided`; the distinction is an
 * authoring convention, not a different runtime shape.
 */
export function createServiceProviderBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return createProviderBuilder<TRequiredContext, TMeta>(options, "service");
}
