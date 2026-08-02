---
level: error
---
# Require Package Publication Coherence

Every workspace package declares whether it is private. Public packages also
carry explicit npm publication metadata and the `npm:public` Nx classification;
private packages carry neither. Any application, service, resource, plugin, or
package kind can become a product through that deliberate classification.

```grit
language json

document(value=$root) where {
  $filename <: r".*/package\.json$",
  $root <: `{ $properties }`,
  $properties <: some pair(key=`"name"`, value=string()),
  or {
    and {
      not { $properties <: some pair(key=`"private"`, value=`true`) },
      not { $properties <: some pair(key=`"private"`, value=`false`) }
    },
    and {
      $properties <: some pair(key=`"private"`, value=`true`),
      or {
        $properties <: some pair(key=`"publishConfig"`, value=$_),
        and {
          $properties <: some pair(key=`"nx"`, value=`{ $nx }`),
          $nx <: some pair(key=`"tags"`, value=`[$tags]`),
          $tags <: some `"npm:public"`
        }
      }
    },
    and {
      $properties <: some pair(key=`"private"`, value=`false`),
      or {
        not {
          $properties <: some pair(key=`"publishConfig"`, value=`{ $publish_config }`),
          $publish_config <: some pair(key=`"access"`, value=`"public"`)
        },
        not {
          $properties <: some pair(key=`"nx"`, value=`{ $nx }`),
          $nx <: some pair(key=`"tags"`, value=`[$tags]`),
          $tags <: some `"npm:public"`
        }
      }
    }
  }
}
```

## Matches a private package with publication metadata

```json
// @filename: services/example/package.json
{
  "name": "@example/service",
  "version": "1.0.0",
  "private": true,
  "publishConfig": { "access": "public" },
  "nx": { "tags": ["type:service"] }
}
```

## Matches an unclassified public package

```json
// @filename: resources/example/package.json
{
  "name": "@example/resource",
  "version": "1.0.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "nx": { "tags": ["type:resource"] }
}
```

## Ignores a private workspace package

```json
// @filename: packages/internal/package.json
{
  "name": "@example/internal",
  "version": "1.0.0",
  "private": true,
  "nx": { "tags": ["type:package"] }
}
```

## Ignores an explicitly public service

```json
// @filename: services/public/package.json
{
  "name": "@example/public-service",
  "version": "1.0.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "nx": { "tags": ["type:service", "npm:public"] }
}
```
