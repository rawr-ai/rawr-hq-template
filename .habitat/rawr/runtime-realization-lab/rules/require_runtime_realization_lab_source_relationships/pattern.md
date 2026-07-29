---
level: error
tags: [runtime-realization-lab, boundary, containment, import]
---
# Require Runtime Realization Lab Source Relationships

The Runtime Realization Lab is a contained proof environment. Shared source
planes and the Reference Runtime remain independent of Oracle implementation,
scenarios use the Lab's local public aliases rather than implementation planes,
Lab source never loads parent-repository apps, packages, services, or plugins,
and raw Effect mechanics remain inside the Lab's SDK, runtime, Oracle, vendor,
and vendor-test lanes.

This law owns static imports, re-exports, and literal `import`, `require`, and
`require.resolve` calls. It does not inspect ordinary path data, computed
module sources, or transitive runtime loading.

```grit
language js(typescript)

// Selects JavaScript and TypeScript source anywhere inside the exact Lab root.
predicate require_runtime_realization_lab_source_relationships_is_lab_source() {
  $filename <: r"(?:^|.*/)tools/runtime-realization-type-env/.*\.[cm]?[jt]sx?$"
}

// Admits quoted sources and substitution-free template sources only.
predicate require_runtime_realization_lab_source_relationships_is_literal_source($source) {
  or {
    $source <: string(),
    and {
      $source <: template_string(),
      $source <: not contains template_substitution()
    }
  }
}

// Classifies one parser-visible source edge against the Lab's stable planes.
function require_runtime_realization_lab_source_relationships_edge_status($filename, $source) js {
  const marker = "/tools/runtime-realization-type-env";
  const rawFilename = $filename.text.replaceAll("\\", "/");
  const filename = rawFilename.startsWith("/") ? rawFilename : `/${rawFilename}`;
  const markerIndex = filename.lastIndexOf(`${marker}/`);
  if (markerIndex < 0) {
    return "allowed:outside-lab";
  }

  const sourceText = $source.text;
  const quote = sourceText[0];
  if (
    sourceText.length < 2 ||
    (quote !== "\"" && quote !== "'" && quote !== "`") ||
    sourceText[sourceText.length - 1] !== quote
  ) {
    return "allowed:not-literal";
  }

  const specifier = sourceText.slice(1, -1);
  if (specifier.startsWith("@rawr/")) {
    const isLocalAlias =
      specifier === "@rawr/sdk" ||
      specifier.startsWith("@rawr/sdk/") ||
      specifier === "@rawr/spec-env" ||
      specifier.startsWith("@rawr/spec-env/");
    return isLocalAlias ? "allowed:local-alias" : "forbidden:foreign-rawr-alias";
  }

  const parentOwnerAliases = ["@apps/", "@packages/", "@services/", "@plugins/"];
  if (parentOwnerAliases.some((prefix) => specifier.startsWith(prefix))) {
    return "forbidden:parent-repository-owner-alias";
  }

  if (specifier === "effect" || specifier.startsWith("effect/")) {
    const relativeFilename = filename.slice(markerIndex + marker.length + 1);
    const rawEffectLanes = [
      "src/sdk/effect.ts",
      "src/runtime/",
      "src/oracle/",
      "src/vendor/effect/",
      "test/vendor/",
    ];
    const isRawEffectLane = rawEffectLanes.some((lane) =>
      lane.endsWith("/") ? relativeFilename.startsWith(lane) : relativeFilename === lane
    );
    return isRawEffectLane
      ? "allowed:raw-effect-lane"
      : "forbidden:raw-effect-outside-runtime";
  }

  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return "allowed:external-source";
  }

  const normalize = (value) => {
    const segments = [];
    for (const segment of value.split("/")) {
      if (segment === "" || segment === ".") {
        continue;
      }
      if (segment === "..") {
        segments.pop();
        continue;
      }
      segments.push(segment);
    }
    return `/${segments.join("/")}`;
  };
  const isWithin = (value, root) => value === root || value.startsWith(`${root}/`);

  const labRoot = filename.slice(0, markerIndex + marker.length);
  const repoRoot = filename.slice(0, markerIndex);
  const destination = normalize(
    `${filename.slice(0, filename.lastIndexOf("/") + 1)}${specifier}`
  );

  const parentOwnerRoots = ["apps", "packages", "services", "plugins"];
  if (parentOwnerRoots.some((owner) => isWithin(destination, `${repoRoot}/${owner}`))) {
    return "forbidden:parent-repository-owner";
  }

  const sharedPlanes = ["adapters", "runtime", "sdk", "spine", "vendor"];
  const isSharedSource = sharedPlanes.some((plane) =>
    isWithin(filename, `${labRoot}/src/${plane}`)
  );
  if (isSharedSource && isWithin(destination, `${labRoot}/src/oracle`)) {
    return "forbidden:shared-source-loads-oracle";
  }

  const isReferenceRuntime =
    isWithin(filename, `${labRoot}/src/reference-runtime`) ||
    isWithin(filename, `${labRoot}/test/reference-runtime`);
  const isOracle =
    isWithin(destination, `${labRoot}/src/oracle`) ||
    isWithin(destination, `${labRoot}/test/oracle`);
  if (isReferenceRuntime && isOracle) {
    return "forbidden:reference-runtime-loads-oracle";
  }

  const scenarioRestrictedPlanes = [
    "oracle",
    "reference-runtime",
    "runtime",
    "adapters",
    "vendor",
    "spine",
  ];
  const isScenario = isWithin(filename, `${labRoot}/scenarios`);
  const loadsScenarioInternal = scenarioRestrictedPlanes.some((plane) =>
    isWithin(destination, `${labRoot}/src/${plane}`)
  );
  if (isScenario && loadsScenarioInternal) {
    return "forbidden:scenario-loads-internal-plane";
  }

  return "allowed:local-source";
}

// Recognizes only literal edges classified as forbidden by the stable plane law.
predicate require_runtime_realization_lab_source_relationships_is_forbidden_source($source) {
  require_runtime_realization_lab_source_relationships_is_literal_source(source=$source),
  $status = require_runtime_realization_lab_source_relationships_edge_status(
    filename=$filename,
    source=$source
  ),
  $status <: includes "forbidden:"
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  require_runtime_realization_lab_source_relationships_is_lab_source(),
  require_runtime_realization_lab_source_relationships_is_forbidden_source(
    source=$source
  )
}
```

## Matches shared source loading Oracle

```typescript
// @filename: tools/runtime-realization-type-env/src/runtime/boot.ts
import { startOracle } from "../oracle";
```

## Matches Reference Runtime tests re-exporting Oracle

```typescript
// @filename: tools/runtime-realization-type-env/test/reference-runtime/runtime.test.ts
export { createOracleHarness } from "../../src/oracle";
```

## Matches a scenario loading an internal source plane

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/app.ts
const compiler = await import("../../src/spine/compiler");
```

## Matches a relative parent-repository dependency

```javascript
// @filename: tools/runtime-realization-type-env/scripts/report.js
const packageRuntime = require("../../../packages/runtime-context/src");
```

## Matches a foreign RAWR alias

```typescript
// @filename: tools/runtime-realization-type-env/test/conformance/runtime.test.ts
const serverPath = require.resolve("@rawr/server/host");
```

## Matches parent-repository owner aliases

```typescript
// @filename: tools/runtime-realization-type-env/test/conformance/runtime.test.ts
import app from "@apps/hq/src";
import sdk from "@packages/hq-sdk";
import service from "@services/example-todo";
import plugin from "@plugins/server/api/example-todo";
```

## Matches raw Effect use outside admitted runtime lanes

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/service.ts
import { Effect } from "effect";
```

## Ignores the two Lab-local aliases

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/app.ts
import { defineApp } from "@rawr/sdk/app";
import { simulate } from "@rawr/spec-env/spine/simulate";
```

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/app.ts
import { defineApp } from "@rawr/sdk/app";
import { simulate } from "@rawr/spec-env/spine/simulate";
```

## Ignores raw Effect in the SDK facade

```typescript
// @filename: tools/runtime-realization-type-env/src/sdk/effect.ts
import { Effect as VendorEffect } from "effect";
```

```typescript
// @filename: tools/runtime-realization-type-env/src/sdk/effect.ts
import { Effect as VendorEffect } from "effect";
```

## Ignores Reference Runtime use of shared source

```typescript
// @filename: tools/runtime-realization-type-env/src/reference-runtime/start.ts
import { createRuntime } from "../runtime/process-runtime";
```

```typescript
// @filename: tools/runtime-realization-type-env/src/reference-runtime/start.ts
import { createRuntime } from "../runtime/process-runtime";
```

## Ignores Oracle use of shared source

```typescript
// @filename: tools/runtime-realization-type-env/src/oracle/harness.ts
import { createRuntime } from "../runtime/process-runtime";
```

```typescript
// @filename: tools/runtime-realization-type-env/src/oracle/harness.ts
import { createRuntime } from "../runtime/process-runtime";
```

## Ignores external packages

```typescript
// @filename: tools/runtime-realization-type-env/src/vendor/effect.ts
import { Type } from "typebox";
```

```typescript
// @filename: tools/runtime-realization-type-env/src/vendor/effect.ts
import { Type } from "typebox";
```

## Ignores computed module sources

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/app.ts
const plane = "spine";
const compiler = await import(`../../src/${plane}/compiler`);
```

```typescript
// @filename: tools/runtime-realization-type-env/scenarios/orders/app.ts
const plane = "spine";
const compiler = await import(`../../src/${plane}/compiler`);
```
