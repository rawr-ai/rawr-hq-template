# R1 Audit: Architecture-Intent Compliance

Date: 2026-02-06  
Scope: `rawr-hq-template` (baseline) and `rawr-hq` (personal) against repo-split intent.

## Verdict

PASS with minor documentation drift.

The split architecture intent is largely upheld:
- Template baseline vs personal boundary is intact (no core code drift detected).
- Routing model exists and is explicit in both repos.
- Plugin channel separation is implemented in docs, config, and command surface.
- No active legacy dual-path runtime command surface was found.

Two low-severity issues remain (routing doc duplication and asymmetric no-legacy evidence retention).

## Findings (Severity Ordered)

### 1) [Low] Personal README duplicates routing section, increasing drift risk

Why this matters:
- Routing clarity is a primary split invariant.
- Duplicate sections can diverge over time and create conflicting operator guidance.

Evidence:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/README.md:34`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/README.md:39`

Recommended fix:
- Keep a single `## Agent Routing` section in personal `README.md`.
- Retain one canonical pointer to `AGENTS_SPLIT.md` and `UPDATING.md`.

### 2) [Low] No-legacy scan artifact is only retained in template repo

Why this matters:
- Personal repo verification is described as complete, but detailed no-legacy scan evidence is stored only in template docs.
- This weakens independent traceability for audits run solely in personal repo context.

Evidence:
- Present: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/repo-split/CLEANUP_LEGACY_SCAN.md:1`
- Absent in personal split docs: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/docs/projects/repo-split/`
- Personal report claims validation without dedicated scan artifact: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/docs/projects/repo-split/FINAL_REPORT.md:22`

Recommended fix:
- Add a personal-side no-legacy scan doc, or
- Add an explicit link in personal `FINAL_REPORT.md` to template `CLEANUP_LEGACY_SCAN.md` pinned to an immutable commit/tag.

## Compliance Evidence (No Finding)

- Boundary control (template vs personal):
  - Near-parity between repos with only split-identity docs differing and one template-side cleanup artifact.
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS_SPLIT.md:5`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/AGENTS_SPLIT.md:7`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/UPDATING.md:47`

- Routing rule exists and is actionable:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS_SPLIT.md:37`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/AGENTS_SPLIT.md:38`

- Plugin channel separation enforced:
  - Policy/docs: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:7`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:17`
  - Config channels: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.config.ts:5`
  - Config normalization defaults: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/control-plane/src/index.ts:95`
  - Runtime commands under `hq/plugins`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/web/enable.ts:8`

- No-legacy command surface:
  - Legacy shim path absent in both repos: `apps/cli/src/commands/plugins/{enable,disable,list,status}.ts`
  - Final verification claim: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/repo-split/FINAL_REPORT.md:47`

## Residual Risks

- Routing drift can reappear if duplicated README sections are edited independently.
- Future sync conflicts may degrade boundary clarity unless `AGENTS_SPLIT.md` and README links are kept as single-source routing anchors.
- No-legacy assurance in personal repo currently relies partly on template-side evidence storage.
