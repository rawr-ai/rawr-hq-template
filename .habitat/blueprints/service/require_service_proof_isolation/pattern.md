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
quoted or substitution-free template module sources that lexically resolve
beneath that service's package-root `test/` directory. A production operation
named `test` is not proof code merely because its local module source contains
the same word. There is no service-proof alias lane. Embedded API-plugin
services and package-root test sources remain outside this source selector.

```grit
language js(typescript)

// Selects TypeScript production source owned by an exact top-level standalone service.
predicate require_service_proof_isolation_is_standalone_production_source() {
  $filename <: r".*services/[^/]+/src/.*\.ts$",
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/src/.*\.ts$"
  }
}

// Classifies a literal relative source by resolving it against its production owner.
function require_service_proof_isolation_relative_source_status($filename, $source) js {
  const filename = $filename.text.replaceAll("\\", "/");
  const source = $source.text;
  const quote = source[0];
  if (
    source.length < 2 ||
    (quote !== "\"" && quote !== "'" && quote !== "`") ||
    source[source.length - 1] !== quote
  ) {
    return "not-literal";
  }
  const specifier = source.slice(1, -1);
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return "not-relative";
  }

  const segments = filename.split("/");
  let serviceIndex = -1;
  for (let index = 0; index < segments.length - 2; index += 1) {
    if (segments[index] === "services" && segments[index + 2] === "src") {
      serviceIndex = index;
    }
  }
  if (serviceIndex < 0) {
    return "outside-service";
  }

  const packageRoot = segments.slice(0, serviceIndex + 2).join("/");
  const resolved = segments.slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.slice(0, serviceIndex + 2).join("/") === packageRoot &&
    resolved[serviceIndex + 2] === "test"
    ? "package-proof"
    : "production";
}

// Recognizes only literal relative sources that resolve into package-root proof.
predicate require_service_proof_isolation_is_relative_test_source($source) {
  or {
    $source <: string(),
    and {
      $source <: template_string(),
      $source <: not contains template_substitution()
    }
  },
  $status = require_service_proof_isolation_relative_source_status(
    filename=$filename,
    source=$source
  ),
  $status <: includes "package-proof"
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

## Ignores a production operation named test

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { test } from "./test";
```

## Ignores a source-local test path

The closed service topology rejects source-owned test directories separately.
This relation remains exact to package-root proof.

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { sourceTest } from "../../../../test/source-test";
```

## Ignores interpolated template sources

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
const proofSegment = "test";
const fixtures = await import(`../../../../${proofSegment}/support/modules/catalog/fixture`);
```
