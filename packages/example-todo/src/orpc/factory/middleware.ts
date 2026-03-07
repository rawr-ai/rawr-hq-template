import type { Middleware, MiddlewareOptions, MiddlewareOutputFn, MiddlewareResult } from "@orpc/server";

import type { BaseMetadata } from "../base";
import type { ProvidedContext, ReservedContextKey } from "../base-foundation";

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

type MergeProvided<
  TContext extends object,
  TAdded extends object,
> = ProvidedContext<ExistingProvided<TContext> & TAdded>;

type AuthoringOptions<
  TInContext extends object,
  TMeta extends BaseMetadata,
> = Omit<MiddlewareOptions<TInContext, unknown, any, TMeta>, "next">;

type NormalMiddlewareCallback<
  TInContext extends object,
  TMeta extends BaseMetadata,
> = (
  options: AuthoringOptions<TInContext, TMeta> & {
    next(): MiddlewareResult<Record<never, never>, unknown>;
  },
  input: unknown,
  output: MiddlewareOutputFn<unknown>,
) => MaybePromise<MiddlewareResult<Record<never, never>, unknown>>;

type ProviderCallback<
  TInContext extends object,
  TAdded extends object,
  TMeta extends BaseMetadata,
> = (
  options: AuthoringOptions<TInContext, TMeta> & {
    next(
      provided: NonReservedOutput<TAdded>,
    ): MiddlewareResult<MergeProvided<TInContext, TAdded>, unknown>;
  },
  input: unknown,
  output: MiddlewareOutputFn<unknown>,
) => MaybePromise<MiddlewareResult<MergeProvided<TInContext, TAdded>, unknown>>;

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
        unknown,
        unknown,
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
 * Create a provider builder for service-local execution context additions.
 */
export function createServiceProviderBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
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
