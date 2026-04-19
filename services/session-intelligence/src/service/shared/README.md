# Session Intelligence Shared Area

This service follows the `services/example-todo` topology. Shared files here
hold service-local schemas, pure source normalization, ports, and errors.

Concrete filesystem, environment, JSONL stream, and SQLite implementations
belong in plugin/app/runtime surfaces that bind this service, not in a
service-specific host package.
