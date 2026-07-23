---
level: error
---
# Require Oclif Command Plugin Configuration

A first-party command capability is a versioned host-composed Oclif plugin.
The host owns the executable. The package-owned `manifest` script invokes the
official Oclif command through Bun and is an executable target inferred by Nx;
workspace configuration owns build ordering and cache behavior, and top-level
Nx Release owns versioning and publication.

```grit
language json

or {
  document(value=$root) where {
    $filename <: r".*plugins/cli/commands/[^/]+/package\.json$",
    $root <: `{ $properties }`,
    or {
      not {
        $properties <: some pair(key=`"name"`, value=$name),
        $name <: r"^\"@rawr/plugin-[a-z0-9-]+\"$"
      },
      not { $properties <: some pair(key=`"version"`, value=string()) },
      not { $properties <: some pair(key=`"type"`, value=`"module"`) },
      $properties <: some pair(key=`"bin"`, value=$bin),
      and {
        $properties <: some pair(key=`"dependencies"`, value=`{ $plugin_dependencies }`),
        $plugin_dependencies <: some pair(key=$plugin_name, value=$plugin_version),
        $plugin_name <: r"^\"@rawr/plugin-[a-z0-9-]+\"$"
      },
      and {
        $properties <: some pair(key=`"devDependencies"`, value=`{ $plugin_dependencies }`),
        $plugin_dependencies <: some pair(key=$plugin_name, value=$plugin_version),
        $plugin_name <: r"^\"@rawr/plugin-[a-z0-9-]+\"$"
      },
      and {
        $properties <: some pair(key=`"peerDependencies"`, value=`{ $plugin_dependencies }`),
        $plugin_dependencies <: some pair(key=$plugin_name, value=$plugin_version),
        $plugin_name <: r"^\"@rawr/plugin-[a-z0-9-]+\"$"
      },
      and {
        $properties <: some pair(key=`"optionalDependencies"`, value=`{ $plugin_dependencies }`),
        $plugin_dependencies <: some pair(key=$plugin_name, value=$plugin_version),
        $plugin_name <: r"^\"@rawr/plugin-[a-z0-9-]+\"$"
      },
      not {
        $properties <: some pair(key=`"scripts"`, value=`{ $scripts }`),
        $scripts <: some pair(key=`"manifest"`, value=`"bun --bun oclif manifest"`)
      },
      not {
        $properties <: some pair(key=`"dependencies"`, value=`{ $dependencies }`),
        $dependencies <: some pair(key=`"@oclif/core"`, value=string())
      },
      not {
        $properties <: some pair(key=`"files"`, value=$files),
        $files <: contains `"dist"`,
        $files <: contains `"oclif.manifest.json"`
      },
      not {
        $properties <: some pair(key=`"oclif"`, value=`{ $oclif }`),
        $oclif <: some pair(key=`"commands"`, value=`"./dist/commands"`),
        $oclif <: some pair(key=`"topicSeparator"`, value=`" "`)
      }
    }
  },
  document(value=$root) where {
    $filename <: r".*plugins/cli/commands/[^/]+/tsconfig\.json$",
    $root <: `{ $properties }`,
    not {
      $properties <: some pair(key=`"compilerOptions"`, value=`{ $compiler_options }`),
      $compiler_options <: some pair(key=`"rootDir"`, value=`"src"`),
      $compiler_options <: some pair(key=`"outDir"`, value=`"dist"`)
    }
  }
}
```

## Matches a binary-bearing plugin

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "bin": { "example": "./bin/run.js" },
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": {
    "commands": "./dist/commands",
    "topicSeparator": " "
  }
}
```

## Matches a wrong installed command root

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": {
    "commands": "./dist/src/commands",
    "topicSeparator": " "
  }
}
```

## Matches an ambiguous plugin source-to-output mapping

```json
// @filename: plugins/cli/commands/example/tsconfig.json
{
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

## Matches a runtime dependency on another command plugin

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": {
    "@oclif/core": "4.11.14",
    "@rawr/plugin-other": "1.0.0"
  },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": { "commands": "./dist/commands", "topicSeparator": " " }
}
```

## Matches a development dependency on another command plugin

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "devDependencies": { "@rawr/plugin-other": "1.0.0" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": { "commands": "./dist/commands", "topicSeparator": " " }
}
```

## Matches a peer dependency on another command plugin

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "peerDependencies": { "@rawr/plugin-other": "1.0.0" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": { "commands": "./dist/commands", "topicSeparator": " " }
}
```

## Matches an optional dependency on another command plugin

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "optionalDependencies": { "@rawr/plugin-other": "1.0.0" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": { "commands": "./dist/commands", "topicSeparator": " " }
}
```

## Ignores canonical plugin configuration

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": {
    "commands": "./dist/commands",
    "topicSeparator": " "
  }
}
```

```json
// @filename: plugins/cli/commands/example/package.json
{
  "name": "@rawr/plugin-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "manifest": "bun --bun oclif manifest" },
  "dependencies": { "@oclif/core": "4.11.14" },
  "files": ["dist", "oclif.manifest.json"],
  "oclif": {
    "commands": "./dist/commands",
    "topicSeparator": " "
  }
}
```

## Ignores the canonical plugin TypeScript command mapping

```json
// @filename: plugins/cli/commands/example/tsconfig.json
{
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

```json
// @filename: plugins/cli/commands/example/tsconfig.json
{
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```
