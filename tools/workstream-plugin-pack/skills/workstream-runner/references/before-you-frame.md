# Before You Frame

Run four meta-design passes before drafting the Frame. The passes are
mandatory; the skills that implement them are not.

If your environment provides skills implementing these (e.g., team design /
perspective / system design / information assessment skills), invoke them. If
those skills are unavailable, the four passes are still mandatory — apply them
conceptually before framing. Specific skill names may change; the four
conceptual passes do not.

Capture each pass's output in `assets/decisions.md` or in the workstream
record's Frame section before Step 1.

## Team Design

Decide roles, count, model tier (heavyweight / lightweight / read-only),
coordination pattern between roles, and failure mode per role. Required even
for a one-DRA workstream — the answer can be "single role: me," but the
question must be answered.

## Perspective Cycling

Walk the workstream from at least three lenses:

- Future DRA picking up cold.
- User reviewing the PR or merge gate.
- Reviewer auditing for hidden ambiguity.

Each lens produces concrete preflight items, gate items, or output-contract
items.

## System Design

Map second-order effects: what fails if each user-decision goes the other way;
what fails if each review layer surfaces P1; what fails if input artifacts
have drifted. The output is a small failure-mode table that feeds into stop
conditions.

## Information Assessment

Evaluate input artifacts as inputs before designing on top of them. Identify
whether the input typed-distinguishes (decisions / ready / borderline / audit)
or whether the DRA must produce that extraction as a Phase 0 output.

## Output

The four passes produce decisions, not commentary. Their results enter the
workstream record's Frame, the seeded `decisions.md`, the lane plan, and the
stop conditions. A pass that produces only narrative description without
decisions has not been completed.
