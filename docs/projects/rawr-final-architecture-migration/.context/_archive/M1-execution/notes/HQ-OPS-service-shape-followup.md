# HQ Ops Service-Shape Follow-Up

## Objective

Repair `services/hq-ops` so it is actually authored and consumed as one service package in the same mold as `services/example-todo`, rather than as a package bucket with a service shell layered on top.

## Why This Follow-Up Exists

U02 reserved the correct shell.
U03 moved authority but also reintroduced the wrong package posture by exposing business-capability subpaths directly:

- `@rawr/hq-ops/config`
- `@rawr/hq-ops/repo-state`
- `@rawr/hq-ops/journal`
- `@rawr/hq-ops/security`

That broke the load-bearing service-boundary rule:

- business truth should live inside the service boundary
- callers should use the service boundary
- package-level support exports must not quietly replace the service boundary

## Concrete Mismatch Against `example-todo`

### What already matches

- `src/index.ts`
- `src/client.ts`
- `src/router.ts`
- `src/service/{base,contract,impl,router}.ts`
- per-module anchors under `src/service/modules/*`

### What does not match

- `services/hq-ops/package.json` exports capability subpaths that `example-todo` does not export
- live consumers depend on those subpaths instead of the service client
- `services/hq-ops/src/{config,repo-state,journal,security}` still carries business-capability ownership outside `src/service/modules/*`
- package tests still prove package-style subpath behavior instead of service-boundary behavior

## Repair Direction

### Boundary repair

- Reduce public exports back to:
  - `.`
  - `./router`
  - `./service/contract`
- eliminate public `./config`, `./repo-state`, `./journal`, and `./security` exports

### Internal ownership repair

- move capability implementation inward so service modules own behavior
- treat top-level capability directories as migration debt to remove, not as a permanent public shape
- keep helper/support code local to the owning module when possible

### Consumer repair

- replace direct subpath imports with canonical `createClient(...)` use
- add thin local client bootstrap helpers in consuming apps/plugins where needed
- keep boundary creation local to the caller; do not add a new global HQ Ops facade

## Current Consumer Clusters

### Config cluster

- `apps/server/src/bootstrap.ts`
- `apps/cli/src/commands/config/*`
- `apps/cli/src/commands/journal/search.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/sources/*`
- `plugins/cli/plugins/src/commands/plugins/web/{enable,enable/all}.ts`
- `packages/agent-sync/src/lib/{layered-config,targets}.ts`

### Repo-state cluster

- `apps/server/src/bootstrap.ts`
- `apps/server/test/{rawr.test.ts,storage-lock-route-guard.test.ts}`
- `plugins/cli/plugins/src/commands/plugins/web/{enable,enable/all,disable,status}.ts`

### Journal cluster

- `apps/cli/src/index.ts`
- `apps/cli/src/commands/workflow/{forge-command,harden}.ts`
- `apps/cli/src/commands/journal/{tail,search}.ts`
- `plugins/cli/plugins/src/lib/factory.ts`

### Security cluster

- `apps/cli/src/lib/security.ts`
- `plugins/cli/plugins/src/lib/security.ts`

## Implementation Order

1. Repair the `services/hq-ops` public boundary and internal ownership map first.
2. Add real service procedures for the capability surface clusters that still need live behavior.
3. Rewire consumers onto `createClient(...)`.
4. Delete the now-illegitimate public subpath exports and any obsolete helper wrappers.
5. Replace package-style tests with service-boundary tests.
6. Run repeated verification and runtime validation before commit.

## Review Questions To Keep Applying

- Is this still exposing a capability as a package utility instead of as a service boundary?
- Does this consumer really need a public export, or does it just need a client call?
- Is any business capability still owned outside `src/service/modules/*`?
- Does this change make HQ Ops more like `example-todo`, or does it just hide the mismatch?
