# HQ Security Module Router

## Purpose

- Evaluate repository dependency and secret-scanning posture and turn it into
  a stable report and risk-tolerance gate decision.

## Scope

- Applies to security checks, enablement gates, and latest-report retrieval in
  this module directory.

## Boundaries

- Security owns finding normalization, severity policy, report persistence,
  and tolerance decisions; callers must not recreate them from raw command
  output.
- Process and filesystem mechanics stay behind host resources. A gate result
  reports admission; it does not itself enable a plugin or mutate lifecycle
  state.

## Behavior

- The module runs dependency audit, untrusted-package, and staged or repository
  secret checks, sorts findings into a report, persists it, and evaluates the
  maximum severity against the requested risk tolerance.

## Concepts

- A **security finding** has normalized severity and evidence. A **security
  report** is the timestamped repository observation; a **risk tolerance**
  defines the maximum admitted severity for an enablement gate.

## Flow

- Check collects and records findings. Gate-enable repeats the current
  observation and returns allowed or force-required status. Report retrieval
  reads the latest persisted result.

## Interfaces

- `securityCheck`, `gateEnable`, and `getSecurityReport` are the caller
  operations. Process and file resources supply scanners and report storage.

## Routing

- [HQ Operations service router](../../../../AGENTS.md)
- [Configuration module](../config/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/hq-ops:typecheck`.
- Run `bunx nx run @rawr/hq-ops:test` for audit and secret findings, report
  persistence, modes, severity ordering, and tolerance gates.
