---
level: error
---
# Require Oclif App Configuration

The installed package manifest describes one conventional Oclif application.
The package-owned `manifest` script is an executable target inferred by Nx.
Workspace Nx configuration owns its build ordering and cache contract, while
top-level Nx Release configuration owns versioning and publication.

```grit
language json

or {
  `{ $properties }` where {
    $filename <: r".*apps/cli/package\.json$",
    or {
      not { $properties <: contains pair(key=`"version"`, value=string()) },
      not { $properties <: contains pair(key=`"type"`, value=`"module"`) },
      not {
        $properties <: contains pair(key=`"dependencies"`, value=$dependencies),
        $dependencies <: contains pair(key=`"@oclif/plugin-plugins"`, value=string())
      },
      not {
        $properties <: contains pair(key=`"bin"`, value=$bin),
        $bin <: contains pair(key=`"rawr"`, value=`"./bin/run.js"`)
      },
      not {
        $properties <: contains pair(key=`"scripts"`, value=$scripts),
        $scripts <: contains pair(key=`"manifest"`, value=`"oclif manifest"`)
      },
      not {
        $properties <: contains pair(key=`"files"`, value=$files),
        $files <: contains `"bin"`,
        $files <: contains `"dist"`,
        $files <: contains `"oclif.manifest.json"`
      },
      not {
        $properties <: contains pair(key=`"oclif"`, value=$oclif),
        $oclif <: contains pair(key=`"bin"`, value=`"rawr"`),
        $oclif <: contains pair(key=`"dirname"`, value=`"rawr"`),
        $oclif <: contains pair(key=`"commands"`, value=`"./dist/commands"`),
        $oclif <: contains pair(key=`"plugins"`, value=$plugins),
        $plugins <: contains `"@oclif/plugin-plugins"`
      }
    }
  },
  `{ $properties }` where {
    $filename <: r".*apps/cli/tsconfig\.json$",
    not {
      $properties <: contains pair(key=`"compilerOptions"`, value=$compiler_options),
      $compiler_options <: contains pair(key=`"rootDir"`, value=`"src"`),
      $compiler_options <: contains pair(key=`"outDir"`, value=`"dist"`)
    }
  }
}
```

## Matches a package without the Oclif-provided extension manager

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "scripts": { "manifest": "oclif manifest" },
  "files": ["bin", "dist", "oclif.manifest.json"],
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": []
  }
}
```

## Matches a package without an executable manifest target

```json
// @filename: apps/cli/package.json
{
  "name": "@rawr/cli",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@oclif/plugin-plugins": "5.4.36" },
  "bin": { "rawr": "./bin/run.js" },
  "files": ["bin", "dist", "oclif.manifest.json"],
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
  "scripts": { "manifest": "oclif manifest" },
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
  "scripts": { "manifest": "oclif manifest" },
  "files": ["bin", "dist", "oclif.manifest.json"],
  "oclif": {
    "bin": "rawr",
    "dirname": "rawr",
    "commands": "./dist/commands",
    "plugins": ["@oclif/plugin-plugins"]
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
