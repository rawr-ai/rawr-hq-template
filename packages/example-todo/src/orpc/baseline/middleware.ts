import type { BaseMetadata } from "./types";
import {
  createNormalMiddlewareBuilder,
  createServiceProviderBuilder,
  createSharedProviderBuilder,
} from "../factory/middleware";

const baseMiddlewareMetadata: BaseMetadata = {
  idempotent: true,
};

/**
 * Baseline middleware builder for reusable domain-package middleware.
 */
export function createBaseMiddleware<
  TRequiredContext extends object = {},
>() {
  return createNormalMiddlewareBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

/**
 * Baseline provider builder for shared/framework middleware.
 */
export function createBaseProvider<
  TRequiredContext extends object = {},
>() {
  return createSharedProviderBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

/**
 * Service-local provider builder for domain-authored execution context.
 */
export function createBaseServiceProvider<
  TRequiredContext extends object = {},
>() {
  return createServiceProviderBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}
