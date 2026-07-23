---
level: error
---
# Require Oclif App Configuration

The package describes one conventional Oclif application. This first ratchet
locks the installed identity, binary, Oclif dependency, compiled command root,
and TypeScript source-to-output mapping. Native extension composition and the
generated release manifest tighten this same rule when those behaviors land.

```grit
language json

or {
  document(value=$root) where {
    $filename <: r".*apps/cli/package\.json$",
    $root <: `{ $properties }`,
    or {
      not { $properties <: some pair(key=`"name"`, value=`"@rawr/cli"`) },
      not { $properties <: some pair(key=`"version"`, value=string()) },
      not { $properties <: some pair(key=`"type"`, value=`"module"`) },
      not {
        $properties <: some pair(key=`"dependencies"`, value=`{ $dependencies }`),
        $dependencies <: some pair(key=`"@oclif/plugin-plugins"`, value=string())
      },
      not {
        $properties <: some pair(key=`"bin"`, value=`{ $bin }`),
        $bin <: some pair(key=`"rawr"`, value=`"./bin/run.js"`)
      },
      not {
        $properties <: some pair(key=`"oclif"`, value=`{ $oclif }`),
        $oclif <: some pair(key=`"bin"`, value=`"rawr"`),
        $oclif <: some pair(key=`"dirname"`, value=`"rawr"`),
        $oclif <: some pair(key=`"commands"`, value=`"./dist/commands"`)
      }
    }
  },
  document(value=$root) where {
    $filename <: r".*apps/cli/tsconfig\.json$",
    $root <: `{ $properties }`,
    not {
      $properties <: some pair(key=`"compilerOptions"`, value=`{ $compiler_options }`),
      $compiler_options <: some pair(key=`"rootDir"`, value=`"src"`),
      $compiler_options <: some pair(key=`"outDir"`, value=`"dist"`)
    }
  }
}
```

## Matches a package without the declared Oclif extension dependency

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/core": "4.11.14" },
  "bin": { "rawr": "./bin/run.js" },
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "files": ["bin", "dist", "oclif.manifest.json"],
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": []
  }
}
```

## Matches a package with the wrong application binary

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "other": "./bin/run.js" },
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-plugins"]
  }
}
```

## Matches an ambiguous source-to-output mapping

```json
// @filename: apps/cli/tsconfig.json
{
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

## Ignores canonical app configuration

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "files": ["bin", "dist", "oclif.manifest.json"],
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-plugins"]
  }
}
```

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "files": ["bin", "dist", "oclif.manifest.json"],
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-plugins"]
  }
}
```

## Ignores the pre-activation app configuration

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-help"]
  }
}
```

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-help"]
  }
}
```

## Ignores the canonical TypeScript command mapping

```json
// @filename: apps/cli/tsconfig.json
{
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

```json
// @filename: apps/cli/tsconfig.json
{
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```
