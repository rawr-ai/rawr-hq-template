# Web Application Router (`@rawr/web`)

## Scope

- Applies to the browser application in `apps/web/**`.

## Boundaries

- Owns the React host shell, browser routing, public environment projection,
  theme, and page composition.
- Must not own server or service state, native plugin installation, or curated
  agent-plugin lifecycle behavior.
- Only explicitly public environment values may cross into browser code.

## Flow

- `src/main.tsx` creates the React root and installs the application shell.
- The shell supplies theme and routing context, then routes locations to page
  components.
- Browser-facing clients call declared remote surfaces; they do not import
  server or service implementations.

## Routing

- [Apps router](../AGENTS.md)
- [Server host](../server/AGENTS.md)
- [UI SDK](../../packages/ui-sdk/AGENTS.md)

## Validation

- `bunx nx run @rawr/web:lint`
- `bunx nx run @rawr/web:typecheck`
- `bunx nx run @rawr/web:test`
- `bunx nx run @rawr/web:build`
