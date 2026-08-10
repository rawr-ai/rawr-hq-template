# Habitat Core Router

## Purpose

- Route Habitat's public SDK and private runtime implementation owners beneath
  one platform-only namespace.

## Scope

- Applies to `packages/core/**` unless a deeper `AGENTS.md` takes ownership.

## Boundaries

- `packages/core` is a namespace, not a package or Nx project.
- `packages/core/sdk` is the sole public Habitat SDK package and retains the
  `@habitat-ai/sdk` identity.
- Private runtime owners remain Nx-only implementation projects and do not
  become package-manager workspaces, publication identities, or public import
  surfaces.
- Product-specific application, command, plugin, and composition behavior does
  not belong under this namespace.

## Behavior

- Route work to the narrowest concrete SDK or runtime owner rather than adding
  source, package metadata, or project metadata at the namespace root.

## Concepts

- A **namespace root** groups related owners without becoming an executable or
  publishable owner itself. The **terminal SDK** assembles admitted private
  implementation owners behind its declared public exports.

## Flow

- Private runtime capabilities flow toward the terminal SDK.
- Consumers enter through declared `@habitat-ai/sdk` exports; private runtime
  owners do not import the SDK facade.

## Interfaces

- The SDK's package exports are the public interface. Project-local contracts
  and Nx dependency edges govern private runtime composition.

## Routing

- [Packages router](../AGENTS.md)
- [Repository router](../../AGENTS.md)
- [Public Habitat SDK](sdk/AGENTS.md)
- [Private runtime-schema owner](runtime/schema/AGENTS.md)
- [Private runtime-definition owner](runtime/definition/AGENTS.md)
- [Private runtime-derivation owner](runtime/derivation/AGENTS.md)

## Validation

- Use `bunx nx show project <project-name> --json` for the concrete owner.
- Use the Nx graph to confirm private runtime dependency direction and the
  terminal SDK assembly edges.
- Run the selected owner's focused typecheck, build, and behavior tests.
