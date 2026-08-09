---
level: error
tags: [repository-separation, imports, predecessors, boundary]
---
# Require Repository Separation Predecessor Source Absence

Habitat JavaScript and TypeScript source does not directly spell a task-2.11
predecessor package in an unescaped static ES-style import or re-export
specifier. This law owns that one parser-visible source-spelling relation.
Project-owned TypeScript checks own cooked or escaped module resolution and
TypeScript import-equals. Nx owns project edges, Habitat structure owns project
topology, the cumulative filesystem acceptance fixture owns deleted-root and
retired-identifier absence, and behavior tests own runtime loaders.

```grit
language js(typescript)

// Recognizes source-spelled, unescaped retired package identities and public subpaths.
predicate require_repository_separation_predecessor_source_absence_is_predecessor($module) {
  $module <: r"^(?:@habitat-ai/(?:service|rawr(?:-agent-plugin-lifecycle|-resource-agent-plugin-package-output|-resource-content-workspace|-resource-native-agent-provider|-resource-versioned-content|-dev|-dev-node|-plugin-devops|-chatgpt-corpus|-plugin-chatgpt-corpus|-hyperresearch-codex|-plugin-hyperresearch|-session-intelligence|-plugin-session-tools|-hq-ops|-hq-sdk)?|typebox-adapter)|@rawr/(?:resource-agent-plugin-export-destination|example-todo|plugin-hello|hq-app|server|web|ui-sdk|runtime-context|test-utils|bootgraph)|rawr-hq-template|provider-agent-plugin-export-destination-effect-platform-node|runtime-realization-type-env|plugin-server-api-example-todo)(?:/.*)?$"
}

or {
  import_statement(source=string(fragment=$module)),
  export_statement(source=string(fragment=$module))
} where {
  require_repository_separation_predecessor_source_absence_is_predecessor(module=$module)
}
```

## Matches a source-spelled predecessor package subpath

```typescript
// @filename: services/catalog/src/legacy.ts
export { oldClient } from "@habitat-ai/rawr-hq-sdk/client";
```

## Ignores TypeScript-owned resolution forms and runtime loads

```typescript
// @filename: services/catalog/src/current.ts
import type { Telemetry } from "@habitat-ai/rawr-core";
export { current } from "../../../packages/core/src/current.js";
import "@habitat-ai/ra\x77r-dev";
import Legacy = require("@habitat-ai/rawr-dev");
const selected = "@habitat-ai/rawr-hq-sdk/client";
void import(selected);
void require("@rawr/web/runtime");
```

## Ignores retired identifiers and ordinary strings

```typescript
// @filename: tools/current.ts
const history = "RawrCommand";
const root = findWorkspaceRoot();
```
