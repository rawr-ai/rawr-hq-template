# `@habitat/blueprints`

`@habitat/blueprints` is a public, data-only npm artifact that transports
selected generic Habitat blueprint data between an exact release and its
consumers.

## Public interface

The package exports `@habitat/blueprints/habitat-pack.json`, its ordinary npm
metadata, and accepted files below `@habitat/blueprints/blueprints/*`.
Protocol 1 is a closed JSON object with these fields:

- `protocolVersion`: the integer `1`.
- `blueprints`: the ordered array of blueprint members admitted to the release.

Version `0.2.0` intentionally has an empty `blueprints` array because no v3
blueprint definition has passed release-pack acceptance. The empty pack does
not activate any definition.

Future blueprint entries have the closed shape `{ id, version, path }`. Their
paths are normalized package-relative files below `blueprints/`; identities are
unique by `id@version` and ordered by identity and version.

## Ownership boundary

This artifact owns the manifest and, after acceptance, the selected generic
blueprint data it transports. It owns no evaluation, activation, instances,
consumer wiring, or runtime. The Habitat product owns pack resolution and
policy evaluation; each consumer owns its exact version selection, repository
instances, and final wiring.

The package contains no executable code and provides no installer. npm package
metadata remains the sole package-name and package-version authority; the pack
protocol does not duplicate it.

The Habitat CLI names this package as an exact required peer. Nx owns separate
release groups for the executable Habitat suite and this data pack. Installed
package acceptance proves the exact pair before publication; release operations
then select the executable group first and this pack second. Consumer
installation selects both exact versions, and the installed CLI admits the
selected pack.
