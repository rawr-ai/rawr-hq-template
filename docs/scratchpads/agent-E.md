# Agent E scratchpad (web host shell)

## Scope (owned paths)
- `apps/web/**`
- `packages/ui-sdk/**` (created)

## UI SDK: mount contract decisions
- Package: `@rawr/ui-sdk`
- Export shape:
  - `mount(el: HTMLElement, ctx: MountContext): void | MountHandle | Promise<...>`
  - `MountHandle` supports optional `unmount()`
- `MountContext` (current fields):
  - `hostAppId` (stable identifier for telemetry / logging)
  - `basePath?` (lets host mount apps under a prefix)
  - `getLocation()` returns `{ pathname, search, hash }` (no direct `window` dependency)
  - `navigate(to, { replace? })` (host-controlled navigation)
  - `onHostNavigate?(listener)` (optional subscription channel)
- Helper: `defineMicroFrontend(mount)` to standardize module shape.

## Routing / navigation choices (host shell)
- Choice: tiny custom client router (no `react-router` dependency).
  - Reason: keep host shell minimal; avoid extra bundle weight/complexity until we need nested routes, loaders, etc.
  - Implementation: `useSyncExternalStore` on `window.location.pathname`, with `pushState`/`replaceState`, `popstate` + a custom `"rawr:navigate"` event.
- Sidebar navigation:
  - `SidebarNav` renders `Link` items; active state derived from pathname.
  - Shell layout is a simple `AppShell` flex split.

## Vite env / secret exposure hygiene
- Rule: no `process.env` usage in client code.
- Rule: restrict `import.meta.env` usage to `apps/web/src/ui/config/publicEnv.ts`.
  - Components import `publicEnv` instead of reading env directly.
  - Avoids accidental exposure patterns and keeps env reads auditable.

## React / performance notes (Vercel best practices)
- Avoid barrel imports; keep components small and direct-import modules.
- Router uses `useSyncExternalStore` (stable subscription API, avoids ad-hoc listener patterns).
- Keep global event listeners centralized (router module), not scattered across components.

## Follow-ups
- Add a micro-frontend registry + a real `mount()` demo behind `/mounts`.
- Consider moving inline styles into a tiny CSS file once UI stabilizes.

