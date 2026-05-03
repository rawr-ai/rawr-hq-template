# OCLIF Native Capabilities

## Direct Answer

OCLIF already has the core concept RAWR needs: a CLI can be extended by plugin packages. Those plugin packages may provide commands, hooks, and nested plugins, and they are loaded by OCLIF itself. RAWR should not invent a parallel command discovery or dispatch system for CLI command plugins.

The RAWR architecture should instead compile app-level CLI composition into native OCLIF plugin membership and use RAWR runtime binding only for process/role resources and service-client construction.

## What RAWR Should Take From OCLIF

The target should use OCLIF's native membership planes rather than create a RAWR command registry:

1. core/app-selected plugins materialized into the intended CLI's OCLIF config;
2. proposed dev-local plugins materialized through OCLIF `devPlugins` or a generated local OCLIF config;
3. external user-installed or linked plugins through `@oclif/plugin-plugins`;
4. optional JIT plugins later for package-size and distribution optimization.

`@oclif/plugin-plugins` gives RAWR install/link mechanics. It does not decide which command plugins belong to a RAWR app. That decision should come from `rawr.hq.ts` and the compiled CLI surface topology.

## Native Plugin Unit

OCLIF describes plugins as a way to:

- offer experimental functionality,
- let users extend a CLI,
- split a CLI into modular components,
- share functionality between multiple CLIs.

OCLIF plugin packages can have commands or hooks just like a CLI. The root CLI adds core plugins through `package.json#oclif.plugins`, and OCLIF also supports minimatch plugin patterns.

Source: [OCLIF plugins](https://oclif.io/docs/plugins/).

## User-Installable Plugins

OCLIF's official `@oclif/plugin-plugins` package exists to let users install plugins into an OCLIF CLI at runtime. Its README describes use cases where users add plugins, where optional functionality is installed later, and where a separately built plugin can later become a core plugin.

Its command surface includes:

- `plugins`
- `plugins inspect`
- `plugins install`
- `plugins link`
- `plugins reset`
- `plugins uninstall`
- `plugins update`

These commands are native OCLIF plugin-manager mechanics. They should be preserved for external user installs, cloned plugin links, and low-level inspection, but they should not become RAWR's app composition authority.

Source: [`@oclif/plugin-plugins`](https://github.com/oclif/plugin-plugins).

## Plugin Loading Order

OCLIF resolves plugins in this order:

1. user plugins installed by users,
2. dev plugins listed under `devPlugins`,
3. core plugins listed under `plugins`.

That order is architecturally important for RAWR. Core/app-composed CLI plugins should be deterministic app membership. User-installed plugins are extension overlays and can override core commands. Dev plugins are a native local-development mechanism that RAWR should consider for first-class local composition.

Source: [OCLIF plugin loading](https://oclif.io/docs/plugin_loading/).

## Command Discovery

OCLIF has three command discovery strategies:

- `pattern`: default glob-based lookup under a target directory.
- `explicit`: import commands from a specified file and export identifier.
- `single`: one command executed by the top-level bin.

For normal RAWR command plugins, `pattern` remains the simplest fit because current plugin packages already build commands into package-local `dist` directories. `explicit` may become useful if RAWR later generates manifest-derived command lists or needs bundled plugin packages, but the docs warn that dynamic command creation cannot use `oclif.manifest.json` and carries production performance cost.

Source: [OCLIF command discovery strategies](https://oclif.io/docs/command_discovery_strategies/).

## Manifests

OCLIF can generate and use `oclif.manifest.json`. Without a manifest, OCLIF may need to require command files to read static command properties. With a manifest, OCLIF can load cached command metadata instead.

The manifest is a per-plugin performance/cache artifact for plugins OCLIF has already selected. It is not the mechanism that selects plugin membership. RAWR's shipped CLI command plugins should usually include generated manifests for performance, while local development can tolerate slower discovery or generate manifests as part of a convergence/build step.

Source: [OCLIF plugin loading](https://oclif.io/docs/plugin_loading/).

## Hooks

OCLIF hooks are lifecycle or custom events declared in plugin or CLI config. Built-in events include `init`, `prerun`, `command_not_found`, `command_incomplete`, `jit_plugin_not_installed`, `preparse`, `postrun`, and `finally`. Custom hooks can be fired with `this.config.runHook()`.

For RAWR, hooks are the native place for CLI-level behavior that should participate in OCLIF lifecycle. They are not a replacement for RAWR runtime binding. A hook can ask for runtime context or service clients through RAWR seams, but it should not create a second process runtime.

Source: [OCLIF hooks](https://oclif.io/docs/hooks/).

## CLI Configuration Surface

OCLIF supports configuration in `package.json#oclif` or rc files. Relevant options include:

- `bin`
- `commands`
- `plugins`
- `devPlugins`
- `hooks`
- `jitPlugins`
- `topicSeparator`
- `topics`
- `aliases`

This gives RAWR a native target for generated or materialized CLI composition. The app manifest should choose CLI command plugin membership; a build/dev convergence step can materialize that into the intended OCLIF config.

Source: [OCLIF CLI configuration](https://oclif.io/docs/configuring_your_cli/).

## JIT Plugins

OCLIF supports just-in-time plugins through `oclif.jitPlugins`, provided the CLI includes a generated manifest and implements the `jit_plugin_not_installed` hook. This can reduce package size while keeping help available for commands that are not installed yet.

JIT is probably not the first RAWR local-development path. It is useful later for larger published command-plugin sets where not every command package should ship inside every CLI installer.

Source: [OCLIF JIT plugins](https://oclif.io/docs/jit_plugins/).

## Native Ergonomics Implication

For local development, RAWR should prefer native OCLIF mechanisms in this order:

1. Core/app-selected plugins materialized into the CLI's OCLIF config.
2. Dev-local plugins materialized into `devPlugins`, a generated local OCLIF config, or linked with one convergence command.
3. User-installed plugins through `@oclif/plugin-plugins`.
4. JIT plugins for later distribution and package-size optimization.

The important point is that "compose CLI plugins" should mean "make OCLIF load the selected plugin packages", not "scan RAWR packages and dispatch commands outside OCLIF".
