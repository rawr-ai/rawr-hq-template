# Canonicality Summary

## Canonical now

- **Host/runtime/plugin model**: [RAWR HQ Model Architecture Memo.md](../../docs/source/RAWR%20HQ%20Model%20Architecture%20Memo.md) plus the later `Server Sidecar Process Model` branches (`03` and `05`) are the best current statement of the runtime ontology.
- **Service internal structure and DB ownership**: [RAWR HQ Internal Structure.md](../../docs/source/RAWR%20HQ%20Internal%20Structure.md) is the durable artifact, with `RAWR NX Evolution Sequence.json` as the originating conversation family.
- **Workflow plugin shell**: [Inngest Plugin API Strategy.md](../../docs/source/Inngest%20Plugin%20API%20Strategy.md) is canonical, backed by `Inngest Plugin API Strategy Branch 00.json`.

## Still relevant but secondary

- `Server Sidecar Process Model Branch 00.json` and `Branch 02.json` remain useful precursor reasoning, but they have been refined by later branches and the memo.
- `Telemetry vs Logging.json` remains relevant as the observability trunk even though the larger architecture sequence overtook the export title.
- `Encore Integration with RAWR.json` is a valid decision record for deferring Encore, but it is not the canonical architecture snapshot.

## Not canonical / superseded / dead

- `Inngest Plugin API Strategy Branch 01.json` is a duplicate export.
- `Server Sidecar Process Model Branch 01.json` is a semantic dead branch into steward/agent-host modeling.
- `Server Sidecar Process Model Branch 04.json` is incomplete and was resumed by `Branch 05`.

## Remaining gaps

- Observability/logging guidance is still conversation-first; there is no dedicated canonical Markdown document for it in this folder.
- The exact implementation shape of generated workflow control surfaces remains open even though the semantic direction is settled.
- Future substrate questions beyond Railway + Nx are still exploratory rather than canonically resolved.
