## Context

Habitat's installed owner check is already inert when unchanged: the measured
repeat completed in 0.80 seconds and Nx reported 13 milliseconds with a cache
hit. Cold profiling also localized the long tail to native Grit program/corpus
evaluation; catalog resolution, native structure checks, and a small Grit law
were each sub-second.

The repository ratchet has two separate inefficiencies. First,
`habitat:lint` declares `{workspaceRoot}/**/*` even though Biome ignores
Markdown, YAML, and other unsupported files. A docs-only archive therefore
selects Habitat and can run policy transitively. Second, the native Nx cache
acceptance performs many sequential daemon-disabled Nx invocations. One
canonical-main run crossed its 60-second outer limit, while the same test passed
on the next run. Raising the timeout would preserve the waste and hide the
flake.

The public Habitat `0.5.2` release, current main, and unchanged owner replay are
already settled. This change improves the repository harness only.

## Goals / Non-Goals

**Goals:**

- Give `habitat:lint` the exact positive filename classes Biome 2.5.3 can admit,
  plus its active formatter configuration.
- Keep the input contract durable through the existing Habitat Nx-workspace
  source law.
- Preserve real Nx affected-selection, task-input, cache-hit, and invalidation
  behavior with fewer native process starts.
- Keep the repository ratchet green on a true cold run and fast on unchanged
  work.

**Non-Goals:**

- Replacing Nx, Grit, Biome, Effect, or the Habitat process resource.
- Enabling Grit's path-insensitive negative cache, combining laws into a shared
  timeout/failure domain, or adding a daemon to the acceptance fixture.
- Adding a Rust engine or another source/structure runner.
- Narrowing ordinary TypeScript task lockfile inputs in this slice; that needs
  an exact dependency/tool closure contract of its own.

## Decisions

### Make Biome's admitted source set the lint input boundary

The lint target will positively include Biome-supported JavaScript/TypeScript,
JSON-family, CSS, GraphQL, HTML/SVG, Vue, Svelte, Astro, and standalone Grit
filename classes, Biome's recognized extensionless JSON filenames, and the root
`.editorconfig`. JSON coverage naturally includes `biome.json`, package
manifests, and other JSON configuration. Nx's native hash plan already includes
external dependencies, so the target will not duplicate the Biome package or
raw lockfile as manual inputs.

Markdown and YAML files remain outside this target because the configured Biome
command does not lint or format them. Their native owners continue to govern
those files. Supported filename classes beneath a
Biome-excluded path remain conservative Nx inputs: Biome owns path exclusion,
and translating its scanner-ignore language into Nx negations would create a
second scanner whose affected semantics are not equivalent. The existing
Nx-workspace Grit law will assert the exact positive lint input list; no manual
structural script is introduced.

### Prove both selection and hashing through Nx

A small repository-level acceptance will ask Nx whether representative
Markdown, TypeScript, and Biome configuration changes select the Habitat lint
owner, and whether the resolved `habitat:lint` inputs contain or exclude those
same paths. A tracked supported file beneath a Biome-excluded path will remain
selected, making the conservative ownership boundary explicit. This exercises
Nx's own affected locator and hash-plan inspection surface rather than
duplicating its glob or ignore semantics in test code.

### Collapse equivalent fixture transitions

The existing native Nx cache fixture will retain the meaningful state classes:
initial cold execution, unchanged replay, unrelated source, sibling-covered
source, covered add/change/delete, rule authority, installed tool identity, and
runtime environment. Projection tests already prove the individual manifest,
baseline, pattern, catalog, coverage, and runtime entries. Native acceptance
therefore needs one representative transition per behavior class, not a new Nx
process for every member of a class.

The fixture remains daemon-disabled and keeps its guarded temporary-root
cleanup. The correction removes redundant launches rather than relaxing a
deadline or creating shared background state.

### Keep true-cold Grit work behind its measured gate

The prior profiling gate remains authoritative: isolate the heavy law against
fresh empty, one-file, partial, and full corpora plus a trivial-pattern/full-
corpus control. Stop investigating Nx, Effect, and the JavaScript wrapper when
fixed overhead is below two seconds or ten percent of the heavy-law sample.
Only native matcher evidence can justify later law decomposition or vendor
profiling. No result in this harness slice admits a custom engine.

## Risks / Trade-offs

- **A new Biome-supported filename is omitted** -> keep the extension and
  recognized-filename set aligned with the pinned Biome version and ratchet it
  as one positive contract.
- **A reduced native matrix misses an input edge** -> retain exhaustive input
  projection tests and preserve one native transition for every behavioral
  class, including add/change/delete.
- **Case-insensitive Biome admission differs from platform globs** -> retain the
  repository's lowercase extension convention; no tracked supported source
  currently uses an uppercase extension.
- **Another broad Nx input remains** -> treat ordinary TypeScript/tool closure
  as a separately measured container rather than widening this change.

## Migration Plan

Land the lint-input correction first and verify docs-only versus source/config
affected selection. Land the native acceptance simplification separately and
run the Habitat CLI test/typecheck targets. Submit both through the ordinary
Graphite and repository-ratchet path, allow canonical-main CI to complete, then
archive the OpenSpec change.

## Open Questions

None. The vendor and repository evidence discriminate the admitted changes.
