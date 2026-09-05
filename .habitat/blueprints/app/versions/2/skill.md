---
name: habitat-app-selection-frame
description: Compose one app through declared profiles, process catalog, and thin entrypoints.
---

# App Selection

The app declares plugin membership in `<app>.app.ts`, process choices in
`runtime/processes.ts`, and provider/configuration selections in
`runtime/profiles/*.ts`. Role entrypoints select these declarations through
`defineEntrypoint`; terminal startup consumes that exact artifact.

This complete version retains the package-backed app shell independently of
version 1. Native host, generator, and test internals remain within their
admitted subtrees; this generic law does not prescribe their implementation or
bundle graph. TypeScript and runtime admission retain identity agreement,
provider coverage, and exact selected-artifact validation.
