# Session Intelligence Shared Area

This service follows the `services/example-todo` topology. Shared files here
hold only cross-module primitives, pure source normalization, resource ports,
and shared boundary errors.

Module-owned behavior belongs in `service/modules/<module>/router.ts`, with
only precise reusable helpers under `service/modules/<module>/helpers/`.
Procedure input/output schemas stay inline in the owning contract; reusable
cross-module entities live in `entities.ts`.

Concrete filesystem, environment, JSONL stream, and SQLite implementations
belong in plugin/app/runtime surfaces that bind this service, not in a
service-specific host package.

Database/index policy is still service behavior. Plugin resources may execute
primitive SQLite operations, but table names, queries, refresh/prune policy, and
destructive semantics stay in the owning module procedure/helpers.
