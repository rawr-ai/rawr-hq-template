# Authoring CLI Topic

## Scope
Own exactly the command-create and extension-create operator projections.

## Boundaries
- Native Args/Flags parse distinct per-kind requests.
- The app injects two stateless generator runners; this topic imports no CLI,
  Nx, filesystem, provider, or process-start implementation.
- Runners determine the invocation's exact current-directory authoring root.
  No appRoot/catalog workspace or parent search is implied here.
- Report completed source-authoring receipts only. Neither command installs,
  activates, selects an app, or changes extension lifecycle state.
- Keep raw arguments and request projection in separate command modules.
  No aggregate output-kind factory or compatibility alias is admitted.

## Validation
Run the owning Nx typecheck, Bun tests, and selected plugin-cli-topic law.
Native host and installed generation acceptance belong to the CLI app.
