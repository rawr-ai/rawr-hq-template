# Agent Config Sync Shared Service Anchors

`services/agent-config-sync` follows the `example-todo` service shell exactly
and keeps its cross-module sync-domain anchors here.

This directory intentionally keeps only cross-module anchors:

- `errors.ts` for reusable ORPC boundary errors once the service needs them.
- `internal-errors.ts` for unexpected internal-only failures.
- `schemas.ts` for shared sync-domain value objects used by multiple modules.
- `ports/*` for host-owned runtime capability contracts.

Concrete source discovery, filesystem mutation, and destination-specific wiring
remain host-owned and must arrive through these ports.
