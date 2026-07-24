---
level: error
tags: [nx, workspace, scheduler, quality]
---
# Require Nx Workspace Scheduler Scripts

The repository root schedules foundational work but does not own foundational
Nx targets. Its six public scripts are exact single-command schedulers. Every
project check reaches ordinary lint through exactly one explicit
`habitat:lint` dependency; package and project manifests cannot declare another
lint owner, and competing lint edges are closed. Unrelated root scripts, root
metadata, and non-lint check dependencies remain outside this rule.

```grit
language json

// Binds the shared check dependency list without owning unrelated target defaults.
predicate is_workspace_check_dependencies($properties, $depends_on) {
  $properties <: some pair(key=`"targetDefaults"`, value=`{ $target_defaults }`),
  $target_defaults <: some pair(key=`"check"`, value=`{ $check }`),
  $check <: some pair(key=`"dependsOn"`, value=`[$depends_on]`)
}

or {
  document(value=$root) where {
    $filename <: r".*package\.json$",
    not {
      $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*package\.json$"
    },
    $root <: `{ $properties }`,
    or {
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"build"`, value=`"nx run-many -t build"`)
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"check"`, value=`"nx run-many -t check"`)
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"lint"`, value=`"nx run habitat:lint"`)
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"test"`, value=`"nx run-many -t test"`)
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"typecheck"`, value=`"nx run-many -t typecheck"`)
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"ci"`, value=`"nx run-many -t build,check,test"`)
      },
      and {
        $properties <: some pair(key=`"nx"`, value=`{ $nx }`),
        $nx <: some pair(key=`"targets"`, value=`{ $targets }`),
        $targets <: some pair(key=$target, value=$_),
        $target <: r"^\"(?:build|check|lint|test|typecheck)\"$"
      }
    }
  },
  document(value=$root) where {
    $filename <: r".*project\.json$",
    not {
      $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*project\.json$"
    },
    $root <: `{ $properties }`,
    $properties <: some pair(key=`"targets"`, value=`{ $targets }`),
    $targets <: some pair(key=$target, value=$_),
    $target <: r"^\"(?:build|check|lint|test|typecheck)\"$"
  },
  document(value=$root) where {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*package\.json$",
    $root <: `{ $properties }`,
    or {
      and {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"lint"`, value=$_)
      },
      and {
        $properties <: some pair(key=`"nx"`, value=`{ $nx }`),
        $nx <: some pair(key=`"targets"`, value=`{ $targets }`),
        $targets <: some pair(key=`"lint"`, value=$_)
      }
    }
  },
  document(value=$root) where {
    $filename <: r".*/(?:apps|packages|plugins|resources|scripts|services|tools)/.*project\.json$",
    not { $filename <: r".*scripts/habitat/project\.json$" },
    $root <: `{ $properties }`,
    $properties <: some pair(key=`"targets"`, value=`{ $targets }`),
    $targets <: some pair(key=`"lint"`, value=$_)
  },
  document(value=$root) where {
    $filename <: r".*nx\.json$",
    $root <: `{ $properties }`,
    or {
      not {
        is_workspace_check_dependencies($properties, $depends_on),
        $depends_on <: some `{ "projects": ["habitat"], "target": "lint" }`
      },
      and {
        is_workspace_check_dependencies($properties, $depends_on),
        or {
          $depends_on <: some `"lint"`,
          $depends_on <: some `"^lint"`
        }
      },
      and {
        is_workspace_check_dependencies($properties, $depends_on),
        $lint_edges = [],
        $depends_on <: some bubble($lint_edges) $dependency where {
          $dependency <: `{ $edge_properties }`,
          $edge_properties <: some pair(key=`"target"`, value=`"lint"`),
          $lint_edges += $dependency
        },
        $lint_edge_count = length(target=$lint_edges),
        ! $lint_edge_count <: 1
      }
    }
  }
}
```

## Matches root scheduler drift

```json
// @filename: package.json
{
  "scripts": {
    "build": "nx run-many -t build",
    "check": "nx run-many -t check",
    "lint": "nx run-many -t lint",
    "test": "nx run-many -t test",
    "typecheck": "nx run-many -t typecheck",
    "ci": "nx run-many -t build,check,test"
  }
}
```

## Matches root target ownership

```json
// @filename: package.json
{
  "scripts": {
    "build": "nx run-many -t build",
    "check": "nx run-many -t check",
    "lint": "nx run habitat:lint",
    "test": "nx run-many -t test",
    "typecheck": "nx run-many -t typecheck",
    "ci": "nx run-many -t build,check,test"
  },
  "nx": {
    "targets": { "check": { "executor": "nx:noop" } }
  }
}
```

## Matches a string lint dependency

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        { "projects": ["habitat"], "target": "lint" },
        "lint",
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```

## Matches an upstream lint dependency

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        { "projects": ["habitat"], "target": "lint" },
        "^lint",
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```

## Matches a competing lint owner

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        { "projects": ["habitat"], "target": "lint" },
        { "projects": ["*"], "target": "lint" },
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```

## Matches a missing shared lint owner

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```

## Matches a project-local package lint owner

```json
// @filename: services/example/package.json
{
  "name": "@example/service",
  "scripts": {
    "lint": "biome lint src"
  }
}
```

## Matches a project-local package Nx lint owner

```json
// @filename: services/example/package.json
{
  "name": "@example/service",
  "nx": {
    "targets": {
      "lint": { "executor": "nx:run-commands" }
    }
  }
}
```

## Matches a project-local Nx lint owner

```json
// @filename: resources/example/project.json
{
  "name": "example-resource",
  "targets": {
    "lint": { "executor": "nx:run-commands" }
  }
}
```

## Matches a root project target owner

```json
// @filename: project.json
{
  "name": "workspace-root",
  "targets": {
    "check": { "executor": "nx:noop" }
  }
}
```

## Ignores the normalized workspace authority

```json
// @filename: package.json
{
  "scripts": {
    "build": "nx run-many -t build",
    "check": "nx run-many -t check",
    "lint": "nx run habitat:lint",
    "test": "nx run-many -t test",
    "typecheck": "nx run-many -t typecheck",
    "ci": "nx run-many -t build,check,test",
    "dev": "bunx nx run @example/web:dev"
  },
  "nx": { "tags": ["type:workspace"] }
}
```

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        { "projects": ["habitat"], "target": "lint" },
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```

```json
// @filename: package.json
{
  "scripts": {
    "build": "nx run-many -t build",
    "check": "nx run-many -t check",
    "lint": "nx run habitat:lint",
    "test": "nx run-many -t test",
    "typecheck": "nx run-many -t typecheck",
    "ci": "nx run-many -t build,check,test",
    "dev": "bunx nx run @example/web:dev"
  },
  "nx": { "tags": ["type:workspace"] }
}
```

```json
// @filename: nx.json
{
  "targetDefaults": {
    "check": {
      "dependsOn": [
        { "projects": ["habitat"], "target": "lint" },
        "typecheck",
        "verify",
        "check:policy",
        "^check"
      ]
    }
  }
}
```
