# SDK Recovery Deferrals

## D-1: Legacy Repository Locators

- Decision: retain the existing physical paths for now, not the legacy product
  names in current prose. The user authorized a local rename only if it would
  preserve Codex projects and related tooling. That safety condition has not
  been established.
- Intended names: Habitat for the platform repository; Marketplace for the
  curated-content repository; Rawr remains the independent downstream product.
- September 15 evidence: Codex lists saved local projects named
  `rawr-hq-template` and `rawr-hq` at their matching paths under
  `$HOME/Documents/.nosync/DEV/habitat/`. Both repositories have linked
  worktrees whose `.git` files point into those primary directories. These are
  stored references, not merely display names.
- Remote evidence: GitHub still resolves `rawr-ai/rawr-hq-template` and
  `rawr-ai/rawr-hq` as their actual repository names. No prior remote rename
  was discovered, and this consolidation performs none.
- Tooling limit: the available Codex project tools expose no project-label or
  project-path update. The attempted supported computer-use route cannot
  operate Codex. Do not work around that by editing its private live state.
- Trigger: an explicit, supported migration path can preserve saved project
  identity and task associations, with affected work quiescent and Git worktree
  administration and path-bound consumers inventoried.
- Verification required: before/after project and task identity, worktree
  access, Graphite parentage, remotes, and relevant tooling still resolve.
  A symlink alias is not a completed rename. A GitHub rename is a separate
  locator migration, not required to store these documents.

## D-2: SDK Repair Implementation

- Decision: no SDK, runtime, generator, source-law, or hook repairs are started
  by this consolidation. The findings are preserved, not declared fixed.
- Trigger: the dedicated historical-data investigation and skill validation
  in [T-1](triage.md#t-1-recover-and-validate-the-collaborative-framing-method)
  are complete enough for owner review; revise both the philosophy and
  assessment, then admit the actual repair plan.
- Reason: otherwise the repair list itself could become the governing frame,
  repeating the abstraction drift the investigation is meant to understand.
- Residual risk: the dated [correctness and authoring findings](assessment.md)
  still apply to the audited release. Consumers should not interpret this
  documentation as new compatibility or lifecycle qualification.
