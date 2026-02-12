# Hook Patterns (Grab and Adapt)

Start narrow, ship, then broaden matchers once you have confidence.

## Pattern: gate sensitive writes

- Event: `PreToolUse`
- Matcher: `Write|Edit`
- Strategy: prompt hook to deny obvious secrets / system paths, require confirmation for risky paths

## Pattern: stop gate before "done"

- Event: `Stop`
- Matcher: `*`
- Strategy: command hook that runs tests/build or checks required outputs exist

## Pattern: session bootstrap

- Event: `SessionStart`
- Matcher: `*`
- Strategy: command hook that writes `export ...` lines to `$CLAUDE_ENV_FILE`

## Pattern: tool audit trail

- Event: `PostToolUse`
- Matcher: `Bash|Write|Edit`
- Strategy: lightweight command hook that appends a log line (avoid secrets)

## Failure modes

<failure-modes>
<failure name="too-broad">
Symptom: hooks slow down everything or block common tasks.
Fix: narrow the matcher; move expensive checks to `Stop` instead of `PreToolUse`.
</failure>
<failure name="slow-hook">
Symptom: hook timeouts or user frustration.
Fix: keep hooks fast; prefer cached reads; avoid network calls.
</failure>
</failure-modes>

