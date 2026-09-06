## REMOVED Requirements

### Requirement: `rawr` is a private Oclif application
**Reason**: Rawr is a downstream product and its application law cannot remain Habitat repository authority after separation.
**Migration**: Before Habitat runtime implementation opens, create the owner-local Rawr OpenSpec in a clean worktree of the existing `rawr-ai/rawr` repository and use native `nx import` from a frozen Habitat source/ref to move only the proven ChatGPT corpus, Hyperresearch, and session-intelligence service/topic closures with filtered history. Delete the rest, then retire this Habitat capability. Any later Rawr application contract consumes released Habitat integration through `bunx nx add @habitat-ai/cli --no-interactive` once and `nx migrate` for upgrades inside the Rawr repository.

### Requirement: Nx and Oclif own their native build relationships
**Reason**: The requirement remains valid product law, but its owner is the independent Rawr repository rather than Habitat.
**Migration**: Re-author only the retained product requirement in the Rawr OpenSpec against released Habitat interfaces and prove it from the Rawr repository's own Nx and Oclif graph; no Habitat-side `apps/rawr` project or compatibility application is created.

### Requirement: Application diagnostics report ordinary state
**Reason**: Rawr diagnostics are product behavior, not Habitat platform authority.
**Migration**: Move retained product diagnostics to the Rawr OpenSpec without adding a controller selector, release store, or compatibility reader. Move retained platform diagnostics to their exact qualified observation or service owner; otherwise delete them. The predecessor root `doctor` command remains absent.

### Requirement: Workspace dependency closure is truthful
**Reason**: The dependency-closure requirement belongs with the Rawr product source and build graph.
**Migration**: Move only retained product closure to the Rawr OpenSpec and replace every Habitat workspace edge with an exact released package interface before Rawr lands.
