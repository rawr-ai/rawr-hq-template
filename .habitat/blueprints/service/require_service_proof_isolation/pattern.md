---
level: error
tags: [service, proof, isolation, import]
---
# Require Service Proof Isolation

Standalone service production source does not import its package-owned proof
corpus. The dependency direction is one-way: package-root tests may consume
production source, while production source remains independent from proof
fixtures, harnesses, and suites.

This law selects only top-level `services/<owner>/src/**/*.ts` sources and only
quoted or substitution-free template module sources containing the exact path
segment `test`. There is no service-proof alias lane. Embedded API-plugin
services and package-root test sources remain outside this source selector.

```grit
language js

// Selects TypeScript production source owned by an exact top-level standalone service.
predicate require_service_proof_isolation_is_standalone_production_source() {
  $filename <: r".*services/[^/]+/src/.*\.ts$",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/.*\.ts$"
  }
}

// Recognizes a quoted or substitution-free template relative source with an exact test segment.
predicate require_service_proof_isolation_is_relative_test_source($source) {
  or {
    $source <: r"^[\"'](?:\./|\.\./)(?:[^/\"']+/)*test(?:/[^\"']*)?[\"']$",
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`(?:\./|\.\./)(?:[^/`]+/)*test(?:/[^`]*)?`$"
    }
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  require_service_proof_isolation_is_standalone_production_source(),
  require_service_proof_isolation_is_relative_test_source(source=$source)
}
```

## Matches a static import

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { catalogFixture } from "../../../../test/support/modules/catalog/fixture";
```

## Matches a re-export

```typescript
// @filename: services/jobs/src/service/model/ports/catalog.ts
export { catalogFixture } from "../../../../test/support/modules/catalog/fixture";
```

## Matches a dynamic import

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixtures = await import("../../../../test/support/modules/catalog/fixture");
```

## Matches a CommonJS require

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixtures = require("../../../../test/support/modules/catalog/fixture");
```

## Matches CommonJS resolution

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixturePath = require.resolve("../../../../test/support/modules/catalog/fixture");
```

## Matches a template dynamic import

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixtures = await import(`../../../../test/support/modules/catalog/fixture`);
```

## Matches a template CommonJS require

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixtures = require(`../../../../test/support/modules/catalog/fixture`);
```

## Matches template CommonJS resolution

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const fixturePath = require.resolve(`../../../../test/support/modules/catalog/fixture`);
```

## Ignores production imports

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { catalogPolicy } from "./model/policy/catalog";
```

## Ignores package-root test sources

```typescript
// @filename: services/jobs/test/behavior/modules/catalog/catalog.test.ts
import { createJobsClient } from "../../../../src/client";
```

## Ignores embedded API-plugin services

```typescript
// @filename: plugins/server/api/pipeline/src/service/modules/jobs/router.ts
import { jobsFixture } from "../../../../test/support/modules/jobs/fixture";
```

## Ignores a contest path segment

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { contestPolicy } from "./contest/policy";
```

## Ignores interpolated template sources

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const proofSegment = "test";
const fixtures = await import(`../../../../${proofSegment}/support/modules/catalog/fixture`);
```
