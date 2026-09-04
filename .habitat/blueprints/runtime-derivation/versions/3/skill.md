---
name: runtime-derivation-v3
description: Cold complete runtime derivation with a closed owner-local TypeScript grammar.
---

# Cold complete runtime derivation

This complete version is independent of every predecessor. Its adjacent
`blueprint.toml` declares its sole structural rule and adjacent runner asset;
no rule or structure is inherited from another version.

The project is one private, package-less Nx owner. `src/index.ts` remains its
assembly entry. Source modules may be decomposed into meaningfully named
kebab-case TypeScript files and subdirectories without adding an owner or
public face. The same owner holds its tests, typecheck proofs, and test-support
modules below `test`; at least one behavior test is required. Directory names
and file kinds remain positively closed at every depth.

Project manifests and configuration remain at the project anchor. Nested
package or owner manifests, non-TypeScript interiors, and file/directory kind
substitutions are not admitted. Filesystem grammar does not redefine public
exports, Nx dependency direction, or behavioral contracts.

Derivation preserves authored references without invoking them. Acquisition, compilation, execution, service binding, and lifecycle behavior remain downstream.
