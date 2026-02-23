# `@rawr/support-triage`

`@rawr/support-triage` models the **support-triage** capability domain in this template.

It demonstrates how one transport-neutral domain package can be reused across:
- API plugin boundary contracts/operations, and
- workflow plugin trigger/durable execution surfaces.

## Domain Meaning

The package models triage job lifecycle behavior (`queued -> running -> completed|failed`) for support tickets, including explicit completion and failure details.

## Hypothetical vs Production

- This package is intentionally example-oriented and non-normative.
- It is safe to use as a reference for package/plugin boundary patterns.
- It is not a production-ready implementation of a real support platform.
