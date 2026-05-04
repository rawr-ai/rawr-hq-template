# Records And Packets

The record is the durable state object for one workstream. It preserves the
frame, decisions, evidence, review outcomes, final output, deferred inventory,
and continuation packet.

Use copy-forward assets instead of inventing another schema:

- `assets/workstream-record.md` for the full record.
- `assets/minimal-workstream-record.md` for the minimal record (sizing rubric below).
- `assets/agent-packet.md` for one delegated lane.
- `assets/wave-packet.md` for one internal phase with multiple lanes.
- `assets/finding-record.md` for findings and disposition.
- `assets/deferred-inventory.md` for unresolved work.
- `assets/next-packet.md` for continuation.

## Sizing rubric

Choose between `assets/workstream-record.md` (full) and
`assets/minimal-workstream-record.md` (minimal) by answering three questions
in order:

1. Will this workstream delegate work to other agents? If no, the agent packet
   asset is unused; the record stays minimal.
2. Will this workstream span more than one logical phase or wave? If no, use
   the minimal record; Frame + Output Contract + Findings + Next Packet are
   sufficient.
3. Will this workstream produce ≥ 5 child artifacts (findings, patches,
   decisions)? If no, inline child content into the record's sections rather
   than maintaining an index.

If all three answer yes, use the full record. If only some answer yes, use
the minimal record plus selective child artifacts.

The rubric closes the over-engineering default. Most workstreams do not need
the full 11-section record, and a record competing with its own children is
the failure mode the minimal scaffold prevents.

Keep records human-readable. Hooks must not parse Markdown headings, tables,
labels, or prose to judge quality. If machine-readable state is needed, use an
explicit pointer or metadata controlled by the project running the workstream.

Agent and wave outputs are evidence candidates. The DRA must accept, reject,
invalidate, waive, or defer every material result before it changes the
workstream.
