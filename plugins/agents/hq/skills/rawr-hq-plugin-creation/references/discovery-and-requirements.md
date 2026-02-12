# Discovery And Requirements

## Objective

Define a decision-complete plugin scope before writing code.

## Minimal question set

1. Should this land in template or personal repo?
2. Is this Channel A or Channel B behavior?
3. Are we migrating existing behavior or creating net-new?
4. What are success signals and non-goals?

## Requirements schema

Use this schema to lock scope:

- `name`
- `repo_destination`
- `channel`
- `origin`
- `source_paths` (if migration)
- `primary_job`
- `success_signals`
- `inputs`
- `outputs`
- `constraints`
- `non_goals`
- `risk_notes`
- `test_plan`
- `docs_needed`

## Planning checkpoints

- Checkpoint 1: routing confirmed.
- Checkpoint 2: channel confirmed.
- Checkpoint 3: requirements and non-goals confirmed.
- Checkpoint 4: implementation slices accepted.
