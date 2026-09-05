# Foundation CLI Topic

## Scope
This private topic owns resolve, check, and hook command projections.

## Boundaries
- The catalog service owns resolution and evaluation semantics.
- `services.ts` declares the complete catalog service use; commands consume the managed context.
- The app selects profiles and providers. Native Oclif owns parsing and dispatch.
- This package must not start a process, acquire providers, or retain a module-global client.
- External extension management remains `habitat plugins ...`; agent-plugin lifecycle is not introduced here.

## Validation
Use the owning Nx project's typecheck, tests, and selected plugin-cli-topic law.
