---
level: error
tags: [effect, resource, provider, error-authority]
---
# Require Resource Effect Error Authority

A resource contract owns the provider-neutral typed failure vocabulary crossing
its capability. `Data.TaggedError` is admitted directly: this boundary does not
require schema-backed errors and does not inherit API or oRPC error policy.
Global `Error` is not a declared Effect failure because it erases the stable
cases consumers can handle.

A provider translates vendor exceptions exactly once. It may own a tagged
failure for a provider-specific operation, while an implementation of the
neutral resource remains assignable to the contract-owned failure through
TypeScript.

This source law owns only explicit two- and three-argument `Effect.Effect`
failure-channel declarations in the acquired resource project. TypeScript owns
cross-file failure ownership, implementation assignability, and inferred
failure channels. Effect's native diagnostics own catch construction and
failure composition. Behavior tests own the provider's actual translation.

```grit
language js(typescript)

// Excludes proof source from the acquired resource project.
predicate resource_v1_effect_error_authority_is_production_source() {
  $filename <: r".*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*",
  ! $filename <: r".*\.(?:test|spec)\.ts$"
}

// Recognizes a same-source class derived from the unqualified global Error.
predicate resource_v1_effect_error_authority_is_error_subclass($name) {
  $program <: contains `class $name extends Error { $body }`
}

// Recognizes a failure slot containing global Error or one same-source subclass.
predicate resource_v1_effect_error_authority_contains_untyped_error($failure) {
  or {
    $failure <: contains `Error`,
    $failure <: contains $name where {
      resource_v1_effect_error_authority_is_error_subclass(name=$name)
    }
  }
}

or {
  `Effect.Effect<$success, $failure>` where {
    resource_v1_effect_error_authority_is_production_source(),
    resource_v1_effect_error_authority_contains_untyped_error(
      failure=$failure
    )
  },
  `Effect.Effect<$success, $failure, $requirements>` where {
    resource_v1_effect_error_authority_is_production_source(),
    resource_v1_effect_error_authority_contains_untyped_error(
      failure=$failure
    )
  }
}
```

## Matches global Error in a resource contract

```typescript
// @filename: contract.ts
import type { Effect } from "effect";
export type SearchResource = {
  search(query: string): Effect.Effect<unknown, Error>;
};
```

## Matches global Error in a union failure channel

```typescript
// @filename: contract.ts
import type { Effect } from "effect";
export type SqlResource = {
  withClient<A, E>(operation: Effect.Effect<A, E>): Effect.Effect<A, E | Error>;
};
```

## Matches a same-source Error subclass in a provider Effect channel

```typescript
// @filename: providers/vendor/index.ts
import type { Effect } from "effect";
class VendorError extends Error {}
export declare const search: () => Effect.Effect<unknown, VendorError>;
```

## Ignores contract-owned tagged failures

```typescript
// @filename: contract.ts
import { Data, type Effect } from "effect";
export class SearchFailure extends Data.TaggedError("SearchFailure")<{
  readonly cause: unknown;
}> {}
export type SearchResource = {
  search(query: string): Effect.Effect<unknown, SearchFailure>;
};
```

## Ignores direct provider translation to the contract failure

```typescript
// @filename: providers/vendor/index.ts
import { Effect } from "effect";
import { SearchFailure, type SearchResource } from "../../contract";
export const createSearchResource = (): SearchResource => ({
  search: () =>
    Effect.tryPromise({
      try: () => Promise.resolve("ok"),
      catch: (cause) => new SearchFailure({ cause }),
    }),
});
```

## Ignores an intentional provider-owned tagged failure

```typescript
// @filename: providers/vendor/index.ts
import { Data, Effect } from "effect";
import { SearchFailure, type SearchResource } from "../../contract";
export class VendorFailure extends Data.TaggedError("VendorFailure")<{
  readonly cause: unknown;
}> {}
export const vendorSearch = Effect.tryPromise({
  try: () => Promise.resolve("ok"),
  catch: (cause) => new VendorFailure({ cause }),
});
export const createSearchResource = (): SearchResource => ({
  search: () =>
    vendorSearch.pipe(Effect.mapError((cause) => new SearchFailure({ cause }))),
});
```

## Ignores catch construction owned by native Effect diagnostics

```typescript
// @filename: providers/vendor/index.ts
import { Effect } from "effect";
export const search = () =>
  Effect.tryPromise({
    try: () => Promise.resolve("ok"),
    catch: (cause) => new Error(String(cause)),
  });
```
