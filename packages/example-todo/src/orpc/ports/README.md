# `src/orpc/ports/`

Ports define the typed capability contracts that the package can consume.

They do **not** instantiate concrete infrastructure clients. Host adapters
conform to these ports and are wired in by the runtime host composition layer.

Use this directory for package-facing capability shapes such as:

- DB/SQL execution contracts
- analytics client contracts
- feedback client contracts
- logger contracts
- other host-provided capabilities that are truly part of the packaged SDK
  boundary
