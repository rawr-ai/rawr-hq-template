# Records And Packets

The record is the durable state object for one workstream. It preserves the
frame, decisions, evidence, review outcomes, final output, deferred inventory,
and continuation packet.

Use copy-forward assets instead of inventing another schema:

- `assets/workstream-record.md` for the full record.
- `assets/agent-packet.md` for one delegated lane.
- `assets/wave-packet.md` for one internal phase with multiple lanes.
- `assets/finding-record.md` for findings and disposition.
- `assets/deferred-inventory.md` for unresolved work.
- `assets/next-packet.md` for continuation.

Keep records human-readable. Hooks must not parse Markdown headings, tables,
labels, or prose to judge quality. If machine-readable state is needed, use an
explicit pointer or metadata controlled by the project running the workstream.

Agent and wave outputs are evidence candidates. The DRA must accept, reject,
invalidate, waive, or defer every material result before it changes the
workstream.
