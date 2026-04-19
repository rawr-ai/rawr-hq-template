# Session Intelligence Shared Area

This service follows the `services/example-todo` topology. Shared files here
hold only cross-module primitives, pure source normalization, resource ports,
and shared boundary errors.

Module-owned behavior and module-only schemas belong under
`service/modules/<module>/`, not in this shared area.

Concrete filesystem, environment, JSONL stream, and SQLite implementations
belong in plugin/app/runtime surfaces that bind this service, not in a
service-specific host package.

Database/index policy is still service behavior. Plugin resources may execute
primitive SQLite operations, but table names, queries, refresh/prune policy, and
destructive semantics stay in the owning module repository.
