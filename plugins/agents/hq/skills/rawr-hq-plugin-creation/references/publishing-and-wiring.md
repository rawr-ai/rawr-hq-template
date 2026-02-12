# Publishing And Wiring

## Local-first baseline

Default posture is local usability first:
- Build/test must pass.
- Channel A must be linked/installed locally.
- Channel B must be enabled locally.

## Channel A wiring

- Local dev: `rawr plugins link <absolute-path> --install`
- Rehearsal install: `rawr plugins install file://<absolute-path>`
- Published install: `rawr plugins install <pkg-or-url>`

## Channel B wiring

- No plugin-manager install step.
- Workspace discovery + enablement:
  - `rawr plugins web list`
  - `rawr plugins web enable <id>`
  - `rawr plugins web status`

## Publish-ready checks

Before public distribution, verify manifest rails:
- `name`
- `version`
- `files`
- `engines`
- `publishConfig`
- `README.md`
- Channel-specific contract fields (`oclif` for A, `exports` for B)
