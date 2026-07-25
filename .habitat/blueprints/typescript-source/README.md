# TypeScript Source Blueprint

This kind owns repository-wide relations that require TypeScript's resolved
source graph. It does not duplicate formatting, lint, type compatibility, or
behavior tests.

`require_imported_exports_have_jsdoc` follows the declaration-documentation
posture established by Magic Migration commit
`255202ec598921c52e1c6511637875532e15df0b` and its later source-scope update at
`91f0433f2597d17412eae5533b45b02a19a958d9`. Civ7's earlier scoped precursor is
commit `4b3bbf846bd55e1ff9f4e5c1e25293c566b9c246`.

Those rules intentionally checked every authored export because Grit cannot
silently join consumer imports back to owner declarations: every `multifile`
collection step is itself a check match. RAWR does not preserve that superset.
The rule-local script is the narrow native-gap adapter. It delegates parsing,
module resolution, aliases, re-exports, symbols, call signatures, and JSDoc
association to the pinned TypeScript compiler API.

The relation builds one TypeScript program per admitted production project
`tsconfig.json`, using that project's parsed files, compiler options, and
references exactly. JavaScript, JSX, TypeScript, and TSX module variants enter
only when at least one production project configuration admits the source.
Unowned script areas are therefore a truthful boundary: this rule does not
invent a repository program for them. Give an area an owning production
`tsconfig.json` before expecting this relation to enforce its imports.

Configurations and source under tests, fixtures, generated output, proof
roots, declarations, and build output remain outside the production relation.
Static named/default imports, static re-exports, and statically named namespace
members resolve to their owner. CommonJS `require`, computed namespace keys,
and a namespace object passed as a whole do not expose a stable exported-symbol
identity and remain outside this rule. Unresolved imports remain TypeScript
typecheck failures rather than documentation guesses.

Every consumed symbol, including a type-only symbol, needs useful declaration
documentation. The additional wide-boundary rule is narrower: only an exported
runtime value with a call signature longer than three parameters needs an
actual, useful `@param` tag for each declared parameter. Callable type aliases
do not pretend to have runtime parameter declarations. Review owns whether
accepted prose usefully explains what, why, ownership, behavior, and flow.

`habitat:check:documentation` is the cacheable owner-local manual check. It is
currently red against the existing corpus and intentionally absent from
`habitat:check:policy`; no baseline hides that state. Once the finding count is
zero, activation is one dependency edge from `check:policy` to
`check:documentation`.

See [[../grit-pattern/skill|the Grit relation frame]] and
[[../../AUTHORITY|the Habitat authority boundary]].
