## 1. Implement The Portable Repository Plan

- [x] 1.1 Add one pure Tree planner for the generic Bun workspace, Nx scheduler,
  TypeScript, Biome, and `habitat` architecture-policy project; preserve unrelated
  consumer configuration and generate no product state.
- [x] 1.2 Add the Bun-only `preset` generator, permissive published preset schema,
  and package metadata; refuse an explicit non-Bun manager before the first Tree
  write.
- [x] 1.3 Share the pure Nx registration planner between `preset` and `init` while
  retaining the existing post-Git Husky activation callback and one Bun-only
  consumer lifecycle.
- [x] 1.4 Update the CLI router and package documentation to distinguish preset
  creation, post-Git activation, and ordinary later `nx migrate` upgrades.

## 2. Prove Native Nx And Package Behavior

- [x] 2.1 Add owner-local Tree tests for exact fresh output, non-Bun refusal,
  consumer preservation, duplicate/incompatible contribution refusal, and
  byte-stable repeat.
- [x] 2.2 Correct installed-package acceptance so the `nx add` case begins without
  `@habitat-ai/cli` installed and validates the exact packed CLI/SDK dependency
  boundary.
- [x] 2.3 Exercise the packed preset through native Bun and Nx, initialize Git, run
  installed `init`, and verify graph shape, hook activation, repeat stability, and
  absence of producer paths or copied `.habitat` policy.

## 3. Review, Land, Release, And Adopt

- [x] 3.1 Pass CLI typecheck, unit tests, build, Oclif manifest, installed-package
  acceptance, strict OpenSpec validation, and unchanged Nx cache replay.
- [ ] 3.2 Obtain Nx/Bun, architecture, TypeScript, and structural-quality reviews;
  resolve every P0/P1 and land the preset as a truthful Graphite checkpoint.
- [ ] 3.3 Include the preset in the next ordinary fixed CLI/SDK Nx release and pass
  registry-installed smoke without publishing another package.
- [ ] 3.4 Apply the released generator to Rawr through native Nx, remove its
  temporary generic wiring in the same checkpoint, and publish the exact migration
  handoff to blocked consumers.
