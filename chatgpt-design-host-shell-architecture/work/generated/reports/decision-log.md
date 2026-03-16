# Decision Log

## Confirmed decisions

- Raw source exports remain untouched; all derived outputs live under `work/`.
- The corpus has four unique thread families and therefore four canonical normalized thread JSONs.
- `Inngest Plugin API Strategy Branch 01.json` is treated as a duplicate export based on identical message content and identical conversation link.
- `Telemetry vs Logging.json` and `RAWR NX Evolution Sequence.json` are treated as one family because they share the same opening trunk and first prompt, after which the longer export continues the conversation.
- `RAWR HQ Internal Structure.md` is treated as both derived from and fully embedded in the NX evolution family because the conversation explicitly references creating the doc and later includes its text inline.
- `RAWR HQ Model Architecture Memo.md` is treated as the canonical high-level host/runtime snapshot and linked most strongly to the server-sidecar family.

## Explicit defaults

- When relationship confidence is lower because evidence is thematic rather than textual, the link is retained but flagged instead of being silently strengthened.
- Branch status is assigned per export artifact, not only per abstract idea, so duplicates and incomplete exports remain visible in the normalized corpus.
- Canonicality may be composite across a Markdown artifact and one or more conversation branches when no single item fully captures the settled view.
