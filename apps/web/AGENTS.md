# Web Application Router (`@rawr/web`)

## Purpose

- Present RAWR's current client-only browser shell and preserve a declared
  client boundary for future remote capabilities.

## Scope

- Applies to the browser application in `apps/web/**`.

## Boundaries

- Owns the React host shell, browser routing, public environment projection,
  theme, and page composition.
- Must not own server or service state, native plugin installation, or curated
  agent-plugin lifecycle behavior.
- Only explicitly public environment values may cross into browser code.
- The current shell has no remote client. `publicEnv.rpcUrl` is projected but
  unused; it does not establish a transport boundary by itself.

## Behavior

- The current browser shell establishes public configuration, theme, and
  navigation, then renders local page composition. Future data operations must
  cross a declared remote client boundary.

## Concepts

- The **web host shell** is the browser composition root. A **public
  environment projection** is the deliberately exposed subset of host
  configuration available to client code.

## Flow

- `src/main.tsx` creates the React root and installs the application shell.
- The shell supplies theme and routing context, then routes locations to page
  components.
- No remote client is currently constructed. A future browser-facing client
  must call a declared remote surface rather than import server or service
  implementations.

## Interfaces

- Browser routes and page components are internal presentation interfaces;
  public environment values are the current host-facing inputs. Generated or
  declared remote clients become admitted inputs only when a client boundary is
  implemented.

## Routing

- [Apps router](../AGENTS.md)
- [Server host](../server/AGENTS.md)
- [UI SDK](../../packages/ui-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/web:typecheck`
- `bunx nx run @rawr/web:test`
- `bunx nx run @rawr/web:build`
