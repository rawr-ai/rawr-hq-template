---
level: error
tags: [service, api, dependency, private-alias]
---
# Require Service Private Alias Configuration

A private service or API alias belongs to exactly one repository owner. Its
package import map may point only at that owner's service interior; alias
spelling cannot hide a dependency on another project.

```grit
language json

// Selects private service/API import-map entries and captures their identity.
predicate is_private_alias($key, $alias_owner, $alias_kind) {
  $key <: r"^\"#([^/]+)-(service|api)(?:/[^\"]*)?\"$"($alias_owner, $alias_kind)
}

// Defines the only admitted service-owner alias and local import-map target.
predicate is_valid_service_alias($owner, $key, $alias_owner, $alias_kind, $value) {
  $alias_owner <: $owner,
  $alias_kind <: r"^service$",
  $key <: r"^\"#[^/]+-service/\*\"$",
  $value <: r"^\"\./src/service/\*(?:\.ts)?\"$"
}

// Defines the only admitted API-owner alias and local import-map target.
predicate is_valid_api_alias($owner, $key, $alias_owner, $alias_kind, $value) {
  $alias_owner <: $owner,
  $alias_kind <: r"^api$",
  $key <: r"^\"#[^/]+-api/\*\"$",
  $value <: r"^\"\./src/service/\*(?:\.ts)?\"$"
}

// Admits the private alias only in its exact top-level service owner manifest.
predicate is_valid_service_owner_manifest($key, $alias_owner, $alias_kind, $value) {
  $filename <: r".*services/([^/]+)/package\.json$"($owner),
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*services/[^/]+/package\.json$"
  },
  is_valid_service_alias($owner, $key, $alias_owner, $alias_kind, $value)
}

// Admits the private alias only in its exact top-level API owner manifest.
predicate is_valid_api_owner_manifest($key, $alias_owner, $alias_kind, $value) {
  $filename <: r".*plugins/server/api/([^/]+)/package\.json$"($owner),
  not {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*plugins/server/api/[^/]+/package\.json$"
  },
  is_valid_api_alias($owner, $key, $alias_owner, $alias_kind, $value)
}

document(value=$root) where {
  $root <: `{ $properties }`,
  $properties <: some pair(key=`"imports"`, value=`{ $imports }`),
  $imports <: some pair(key=$key, value=$value),
  is_private_alias($key, $alias_owner, $alias_kind),
  not {
    or {
      is_valid_service_owner_manifest($key, $alias_owner, $alias_kind, $value),
      is_valid_api_owner_manifest($key, $alias_owner, $alias_kind, $value)
    }
  }
}
```

## Matches an external service target

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#jobs-service/*": "@rawr/server/*"
  }
}
```

## Matches a foreign service alias

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#catalog-service/*": "./src/service/*.ts"
  }
}
```

## Matches an exact key that shadows the owner wildcard

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#jobs-service/*": "./src/service/*.ts",
    "#jobs-service/host": "./src/host.ts"
  }
}
```

## Matches a private root key without the canonical wildcard

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#jobs-service": "@rawr/other-service"
  }
}
```

## Matches a cross-kind API alias

```json
// @filename: plugins/server/api/catalog/package.json
{
  "imports": {
    "#catalog-service/*": "./src/service/*"
  }
}
```

## Matches an alias declared outside a service or API owner

```json
// @filename: package.json
{
  "imports": {
    "#jobs-service/*": "./services/jobs/src/service/*.ts"
  }
}
```

## Matches a nested manifest that only resembles an owner root

```json
// @filename: tools/generator/services/jobs/package.json
{
  "imports": {
    "#jobs-service/*": "./src/service/*.ts"
  }
}
```

## Matches a same-family nested service manifest

```json
// @filename: services/outer/test/services/jobs/package.json
{
  "imports": {
    "#jobs-service/*": "./src/service/*.ts"
  }
}
```

## Matches a noncanonical empty private subpath

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#jobs-service/": "./src/service/*.ts"
  }
}
```

## Ignores owner-local aliases and unrelated import-map entries

```json
// @filename: services/jobs/package.json
{
  "imports": {
    "#jobs-service/*": "./src/service/*.ts",
    "#fixture": "./test/fixture.ts"
  }
}
// @filename: plugins/server/api/catalog/package.json
{
  "imports": {
    "#catalog-api/*": "./src/service/*"
  }
}
```
