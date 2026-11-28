# Native migration: observed qualification

**Landed on November 27, 2026.** [Product PR #1034](https://github.com/rawr-ai/rawr-hq-template/pull/1034)
landed as squash `c5173e001` (one parent, tree `5aff0184`), the same tree as
the frozen RC3 source `5df49bfc`; see its
[landing receipt](https://github.com/rawr-ai/rawr-hq-template/pull/1034#issuecomment-7232656460).
The
[Repository Ratchet run for that push to `main`](https://github.com/rawr-ai/rawr-hq-template/actions/runs/46098672961/job/140835864026)
passed. This note records what was observed for the RC1 and RC3 private builds.
It does not describe the `0.7.0` archives; see [Release boundary](#release-boundary).

## Package identity

These are private Darwin builds, not registry releases. Each digest names a
complete archive, not just its version or installed file contents.

| Package | RC1 (November 19) SHA-256 | RC3 (November 25) SHA-256 |
| --- | --- | --- |
| `@habitat-ai/sdk` | `29fba0d42af31b9dbcb76a451fe5cd398b4955dd292713231d70347d6331de62` | `c6ed6d73e0abfedc7b606b3bd70b57287857f4d3148a161555224a7545b2fdb3` |
| `@habitat-ai/cli` | `896f7a0c39a373af2e8c3422237f910c3704af986c3c5ce28bcf735c9589534c` | `e028ff4ff3351bbe9381fb7090c8b670da166a93a829fda92b0e769622bfc0d6` |

The [RC1 qualification](native-migration-candidate.md#rc1-private-qualification)
applies only to the RC1 pair. Two RC3 producers and the installed suite
reproduced the RC3 pair. Default npm and Bun installs each matched all 275 SDK
and 58 CLI files. The installed RC3 CLI evaluated 93 policy applications across
38 owners with no findings. Hosted jobs built their own packages; their verdicts
do not establish identical archive bytes.

## Runner results

| RC3 check at `5df49bfc` | Observed result |
| --- | --- |
| Darwin ARM64 | Cold workspace check, without the Nx cache, passed 147 tasks. Installed suite: 48 passed, three Windows-only skips. |
| [Repository Ratchet](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45733790578/job/139622092779) | Required PR check passed. The run for the merge on `main` is linked above. |
| [Ubuntu installed](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45733790450/job/139622015092) | 46 passed, five skipped. |
| [Windows installed](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45733790450/job/139622015397) | 38 passed, two failed, eleven skipped. See [Windows: parked](#windows-parked). |

## Windows: parked

On November 27 the platform owner parked Windows. It is not supported in
`0.7.0`, CI no longer runs a Windows job, and no Windows result gates a
release. The Windows code paths remain in the CLI but are untested. Resuming
Windows is a separate owner decision. What follows is history, not a support
statement.

Both failures in the full RC3 Windows job were deadlines, not wrong results.
Preset workspace creation (`bunx create-nx-workspace`) stopped at its
180-second limit, after 180.2 s. Installing the candidate pair during the 0.5.6
upgrade stopped at its 120-second limit, after 120.1 s. The cause of either
wait was not identified.

[Grit's directory walk](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45095468232/job/137434188471)
missed a seeded violation that the same unchanged rule found when given the
same three files with forward slashes. In the RC3 full job, the explicit-file
case found the correct relative path. A physical directory and an oversized
file list both failed the check rather than reporting a clean scan.

Windows diagnostics were never product qualification. A [separate full suite](https://github.com/rawr-ai/rawr-hq-template/pull/1036#issuecomment-7182144190)
passed all 40 runnable cases with isolated candidate caches. In a [paired
three-operation probe](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45753498208),
both 0.5.3 migrations completed; one preset finished in 50.7 seconds and the
other reached 180 seconds, before the cache settings differed. Neither run
explains the two product deadlines.

## Release boundary

[Release PR #1037](https://github.com/rawr-ai/rawr-hq-template/pull/1037)
merged as `850147ca`. It moved both packages from `0.7.0-rc.3` to `0.7.0`
and removed the Windows entry from the installed-package matrix. The `0.7.0`
archives are different bytes from RC3, so the digests and results above do
not describe them. This note makes no claim about the release tag, registry
publication or the published packages. Deployment and external export are
out of scope.
