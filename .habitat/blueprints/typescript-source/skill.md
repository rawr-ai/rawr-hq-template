---
name: habitat-typescript-source-direction
description: Mental model for TypeScript source relations that need resolved cross-file identity without creating a second source graph.
---

# TypeScript Source Direction

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. The adjacent rule packet carries executable authority.

## Frame

A source-file boundary turns a local declaration into context for another
owner. Documentation belongs at that declaration because the declaration owns
the meaning. The consumer should not need to reconstruct why the symbol exists,
what behavior it participates in, or which invariant it carries.

Exports alone do not create this obligation. Consumption does. A local-only
export may be removed or remain undocumented; a JavaScript or TypeScript symbol
imported into another production source file has crossed the boundary and must
explain itself there.

TypeScript already knows the graph. Habitat asks each production project's
exact TypeScript program for import, alias, re-export, signature, and JSDoc
facts rather than approximating them with file names or constructing another
registry. Review judges meaning. The source rule only proves that the owner
supplied a non-placeholder explanation and, for wide value-callable
boundaries, attached a useful `@param` tag to each actual parameter.

## Gradient

```text
declaration -> export -> import -> behavior
```

Documentation flows from owner to consumer. Type resolution flows from
consumer back to owner. Habitat admits the relation without becoming either
owner.

## Relations

- [[README|TypeScript source blueprint]]
- [[require_imported_exports_have_jsdoc/rule|Imported-export JSDoc law]]
- [[../grit-pattern/skill|Grit pattern frame]]
- [[../../AUTHORITY|Habitat authority]]
