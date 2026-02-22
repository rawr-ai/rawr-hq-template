# Schema Object-Root Helper Scratchpad

## Notes
- Task is docs-policy only.
- `schema({...})` is a docs shorthand rule, not a runtime API change.
- Non-`Type.Object` roots stay explicit through `std(...)`/`typeBoxStandardSchema(...)`.

## Verification
- [ ] Posture policy defines `schema({...})` mapping explicitly.
- [ ] Packet-level policy mirrors the same mapping.
- [ ] Axis policy docs with wrapper guidance are updated consistently.
- [ ] Commit is scoped to schema-helper policy files only.
