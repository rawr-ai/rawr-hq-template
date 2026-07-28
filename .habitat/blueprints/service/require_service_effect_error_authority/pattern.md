---
level: error
tags: [effect, service, error-authority]
---
# Require Service Effect Error Authority

A fallible service capability owns the exact typed failure crossing its
boundary. Define it beside its sole owning port by default. When multiple
sibling ports deliberately share one capability failure, place it in the
module's `model/errors` rather than making either port own the other.
`Data.TaggedError` is the default for in-process failure identity;
`Schema.TaggedErrorClass` is appropriate only when a separately serialized
boundary requires schema authority. Global `Error` is not a declared Effect
failure because it erases the stable cases a service can interpret.

An adapter translates foreign exceptions exactly once into the capability-owned
failure. A procedure then maps that capability failure into a public outcome
through the `errors.*` constructors supplied by its native oRPC handler.
Service-owned stores map the exact native failure union of the operation they
own; no database-session failure carrier is admitted.

This source law owns only explicit two- and three-argument `Effect.Effect`
failure-channel declarations. TypeScript owns cross-file failure ownership,
implementation assignability, and inferred failure channels. Effect's native
diagnostics own catch construction and failure composition. Behavior tests own
actual adapter translation and procedure mapping.

```grit
language js(typescript)

// Selects production TypeScript owned by standalone or embedded API services.
predicate require_service_effect_error_authority_is_service_source() {
  $filename <: r".*(?:services/[^/]+/src/.*|plugins/server/api/[^/]+/src/service/.*)\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*",
  ! $filename <: r".*\.(?:test|spec)\.ts$"
}

// Recognizes a same-source class derived from the unqualified global Error.
predicate require_service_effect_error_authority_is_error_subclass($name) {
  $program <: contains `class $name extends Error { $body }`
}

// Recognizes a failure slot containing global Error or one same-source subclass.
predicate require_service_effect_error_authority_contains_untyped_error($failure) {
  or {
    $failure <: contains `Error`,
    $failure <: contains $name where {
      require_service_effect_error_authority_is_error_subclass(name=$name)
    }
  }
}

or {
  `Effect.Effect<$success, $failure>` where {
    require_service_effect_error_authority_is_service_source(),
    require_service_effect_error_authority_contains_untyped_error(
      failure=$failure
    )
  },
  `Effect.Effect<$success, $failure, $requirements>` where {
    require_service_effect_error_authority_is_service_source(),
    require_service_effect_error_authority_contains_untyped_error(
      failure=$failure
    )
  }
}
```

## Matches global Error in a service port

```typescript
// @filename: services/discovery/src/service/modules/source-acquisition/model/ports/listing-search.ts
import type { Effect } from "effect";
export type ListingSearchPort = {
  search(query: string): Effect.Effect<readonly unknown[], Error>;
};
```

## Matches global Error in a union failure channel

```typescript
// @filename: services/jobs/src/service/db/stores/jobs.ts
import type { Effect } from "effect";
export type JobsStore = {
  find(id: string): Effect.Effect<unknown, Error>;
};
```

## Matches a same-source Error subclass in a three-argument channel

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/router/submit.ts
import type { Effect } from "effect";
class JobsFailure extends Error {}
export declare const submit: Effect.Effect<unknown, JobsFailure, object>;
```

## Ignores a port-owned Data.TaggedError failure

```typescript
// @filename: services/discovery/src/service/modules/source-acquisition/model/ports/listing-search.ts
import { Data, type Effect } from "effect";
export class ListingSearchFailure extends Data.TaggedError(
  "ListingSearchFailure",
)<{
  readonly cause: unknown;
}> {}
export type ListingSearchPort = {
  search(query: string): Effect.Effect<readonly unknown[], ListingSearchFailure>;
};
```

## Ignores a separately serialized Schema.TaggedErrorClass failure

```typescript
// @filename: services/collect/src/service/modules/jobs/model/ports/admission.ts
import { Schema, type Effect } from "effect";
export class AdmissionFailure extends Schema.TaggedErrorClass<AdmissionFailure>()(
  "AdmissionFailure",
  { reason: Schema.String },
) {}
export declare const admit: Effect.Effect<unknown, AdmissionFailure>;
```

## Ignores a store-owned typed failure

```typescript
// @filename: services/jobs/src/service/db/stores/jobs.ts
import { Data, type Effect } from "effect";
export class JobsQueryFailure extends Data.TaggedError("JobsQueryFailure")<{
  readonly cause: unknown;
}> {}
export type JobsStore = {
  find(id: string): Effect.Effect<unknown, JobsQueryFailure>;
};
```

## Ignores native query-failure translation inside the owning store

```typescript
// @filename: services/jobs/src/service/db/stores/jobs.ts
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-postgres";
import { Data, Effect } from "effect";
export class JobsQueryFailure extends Data.TaggedError("JobsQueryFailure")<{
  readonly cause: EffectDrizzleQueryError;
}> {}
declare const query: Effect.Effect<unknown, EffectDrizzleQueryError>;
export const find = query.pipe(
  Effect.mapError((cause) => new JobsQueryFailure({ cause })),
);
```

## Ignores procedure mapping through contract-declared errors

```typescript
// @filename: services/discovery/src/service/modules/source-acquisition/router/search.ts
import { Effect } from "effect";
export const search = module.search.effect(function* ({ errors }) {
  return yield* Effect.fail(
    errors.NOT_FOUND({ message: "Listing was not found" }),
  );
});
```

## Ignores catch construction owned by native Effect diagnostics

```typescript
// @filename: services/discovery/src/service/modules/source-acquisition/router/search.ts
import { Effect } from "effect";
export const search = () =>
  Effect.tryPromise({
    try: () => Promise.resolve([]),
    catch: (cause) => new Error(String(cause)),
  });
```

## Ignores test source

```typescript
// @filename: services/discovery/test/behavior/modules/source-acquisition/search.test.ts
import type { Effect } from "effect";
export declare const failure: Effect.Effect<never, Error>;
```
