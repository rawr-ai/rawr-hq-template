---
name: runtime-bootgraph-v2
description: Private cold lifecycle ordering with a closed owner-local TypeScript grammar.
---

# Private cold lifecycle ordering

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

Bootgraph orders compiler-owned dependency data without acquiring, releasing, executing, mounting, or observing runtime values. Its policy asset creates no public SDK face.
