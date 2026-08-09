---
level: error
tags: [service, package, client, boundary]
---
# Require Service Public Face

A service package publishes exactly one subpath: `./client`. Every conditional
leaf targets the canonical `src/client` or `dist/client` artifact. TypeScript
and the package owner prove target existence and type agreement.

```grit
language json

// Recognizes the only string leaf admitted beneath the public client export.
predicate service_v2_public_face_is_client_target($target) {
  $target <: string(),
  $target <: r"^\"\./(?:src|dist)/client(?:\.d)?\.[cm]?[jt]s\"$"
}

// Recognizes a client target or a conditional container that can lead to one.
predicate service_v2_public_face_is_supported_value($value) {
  or {
    service_v2_public_face_is_client_target(target=$value),
    $value <: `{ $_ }`,
    $value <: `[$_]`
  }
}

// Binds the sole exports object and its sole ./client value.
predicate service_v2_public_face_has_closed_export($root, $client) {
  $root <: `{ $properties }`,
  $export_pairs = [],
  $properties <: some bubble($export_pairs) $export_pair where {
    $export_pair <: pair(key=`"exports"`, value=$_),
    $export_pairs += $export_pair
  },
  $export_pair_count = length(target=$export_pairs),
  $export_pair_count <: 1,
  $properties <: some pair(key=`"exports"`, value=`{ $exports }`),
  $export_count = length(target=$exports),
  $export_count <: 1,
  $exports <: some pair(key=`"./client"`, value=$client)
}

// Proves every nonempty conditional branch terminates at a client artifact.
predicate service_v2_public_face_is_closed_client_value($client) {
  service_v2_public_face_is_supported_value(value=$client),
  not { $client <: or { `{}`, `[]` } },
  not { $client <: contains or { `{}`, `[]` } },
  not {
    $client <: `[$items]`,
    $items <: some $item where {
      not { service_v2_public_face_is_supported_value(value=$item) }
    }
  },
  not {
    $client <: contains `[$items]` where {
      $items <: some $item where {
        not { service_v2_public_face_is_supported_value(value=$item) }
      }
    }
  },
  not {
    $client <: contains pair(value=$member) where {
      not { service_v2_public_face_is_supported_value(value=$member) }
    }
  }
}

document(value=$root) where {
  $filename <: r"(?:^|.*/)package\.json$",
  not {
    service_v2_public_face_has_closed_export(root=$root, client=$client),
    service_v2_public_face_is_closed_client_value(client=$client)
  }
}
```

## Canonical

```json
{"exports":{"./client":{"types":"./dist/client.d.ts","default":"./dist/client.js"}}}
```

## Rejected

```json
{"exports":{".":"./src/client.ts","./client":"./src/service/router.ts"}}
```
