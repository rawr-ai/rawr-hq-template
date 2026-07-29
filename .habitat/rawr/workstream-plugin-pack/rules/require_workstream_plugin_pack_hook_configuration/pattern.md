---
level: error
tags: [workstream-plugin-pack, hooks, configuration, boundary]
---
# Require Workstream Plugin Pack Hook Configuration

The pack manifest and repository hook composition invoke the same canonical
workstream sources. SessionStart loads the startup hook, and Stop runs the
closure guard. Other events and additional repository-owned hooks remain
outside this relation.

```grit
language json

// Classifies a checked-in command against the two canonical pack hook sources.
function require_workstream_plugin_pack_hook_configuration_status($command) js {
  let source;
  try {
    source = JSON.parse($command.text);
  } catch {
    return "invalid";
  }
  if (typeof source !== "string") return "invalid";

  const startup =
    'bun "$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts"';
  const stop =
    'bun "$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts"';
  if (source === startup) return "canonical-startup";
  if (source === stop) return "canonical-stop";
  if (source.includes("workstream_startup")) return "alternate-startup";
  if (source.includes("workstream_closure_guard")) return "alternate-stop";
  return "unrelated";
}

// Proves the document has exactly one effective top-level hooks object.
predicate require_workstream_plugin_pack_hook_configuration_has_hooks($root, $properties) {
  $root <: `{ $properties }`,
  $hook_pairs = [],
  $properties <: some bubble($hook_pairs) $hook_pair where {
    $hook_pair <: pair(key=`"hooks"`, value=$_),
    $hook_pairs += $hook_pair
  },
  $hook_pair_count = length(target=$hook_pairs),
  $hook_pair_count <: 1,
  $properties <: some pair(key=`"hooks"`, value=`{ $_ }`)
}

or {
  document(value=$root) where {
    $filename <: r"(?:^|.*/)(?:\.codex/hooks\.json|tools/workstream-plugin-pack/hooks/hooks\.json)$",
    not {
      require_workstream_plugin_pack_hook_configuration_has_hooks(
        root=$root,
        properties=$_
      )
    }
  },
  document(value=$root) where {
    $filename <: r"(?:^|.*/)(?:\.codex/hooks\.json|tools/workstream-plugin-pack/hooks/hooks\.json)$",
    require_workstream_plugin_pack_hook_configuration_has_hooks(
      root=$root,
      properties=$properties
    ),
    or {
    not {
      $properties <: some pair(key=`"hooks"`, value=`{ $session_hooks }`),
      $session_hooks <: some pair(key=`"SessionStart"`, value=`[$session_entries]`),
      $session_entries <: some $session_entry where {
        $session_entry <: `{ $session_entry_properties }`,
        $session_entry_properties <: some pair(key=`"hooks"`, value=`[$session_commands]`),
        $session_commands <: some $session_command where {
          $session_command <: `{ $session_command_properties }`,
          $session_command_properties <: some pair(key=`"type"`, value=`"command"`),
          $session_command_properties <: some pair(key=`"command"`, value=$session_source),
          $session_status = require_workstream_plugin_pack_hook_configuration_status(
            command=$session_source
          ),
          $session_status <: includes "canonical-startup"
        }
      }
    },
    not {
      $properties <: some pair(key=`"hooks"`, value=`{ $stop_hooks }`),
      $stop_hooks <: some pair(key=`"Stop"`, value=`[$stop_entries]`),
      $stop_entries <: some $stop_entry where {
        $stop_entry <: `{ $stop_entry_properties }`,
        $stop_entry_properties <: some pair(key=`"hooks"`, value=`[$stop_commands]`),
        $stop_commands <: some $stop_command where {
          $stop_command <: `{ $stop_command_properties }`,
          $stop_command_properties <: some pair(key=`"type"`, value=`"command"`),
          $stop_command_properties <: some pair(key=`"command"`, value=$stop_source),
          $stop_status = require_workstream_plugin_pack_hook_configuration_status(
            command=$stop_source
          ),
          $stop_status <: includes "canonical-stop"
        }
      }
    },
    and {
      $properties <: some pair(key=`"hooks"`, value=`{ $session_hooks }`),
      $session_hooks <: some pair(key=`"SessionStart"`, value=`[$session_entries]`),
      $session_entries <: some $session_entry where {
        $session_entry <: `{ $session_entry_properties }`,
        $session_entry_properties <: some pair(key=`"hooks"`, value=`[$session_commands]`),
        $session_commands <: some $session_command where {
          $session_command <: `{ $session_command_properties }`,
          $session_command_properties <: some pair(key=`"type"`, value=`"command"`),
          $session_command_properties <: some pair(key=`"command"`, value=$session_source),
          $session_status = require_workstream_plugin_pack_hook_configuration_status(
            command=$session_source
          ),
          or {
            $session_status <: includes "alternate-startup",
            $session_status <: includes "alternate-stop",
            $session_status <: includes "canonical-stop"
          }
        }
      }
    },
    and {
      $properties <: some pair(key=`"hooks"`, value=`{ $stop_hooks }`),
      $stop_hooks <: some pair(key=`"Stop"`, value=`[$stop_entries]`),
      $stop_entries <: some $stop_entry where {
        $stop_entry <: `{ $stop_entry_properties }`,
        $stop_entry_properties <: some pair(key=`"hooks"`, value=`[$stop_commands]`),
        $stop_commands <: some $stop_command where {
          $stop_command <: `{ $stop_command_properties }`,
          $stop_command_properties <: some pair(key=`"type"`, value=`"command"`),
          $stop_command_properties <: some pair(key=`"command"`, value=$stop_source),
          $stop_status = require_workstream_plugin_pack_hook_configuration_status(
            command=$stop_source
          ),
          or {
            $stop_status <: includes "alternate-startup",
            $stop_status <: includes "alternate-stop",
            $stop_status <: includes "canonical-startup"
          }
        }
      }
    }
    }
  }
}
```

## Matches a non-object hook document

```json
// @filename: .codex/hooks.json
[]
```

## Matches duplicate top-level hook owners

```json
// @filename: tools/workstream-plugin-pack/hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  },
  "hooks": {}
}
```

## Matches a copied SessionStart hook

```json
// @filename: tools/workstream-plugin-pack/hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun .codex/hooks/workstream_startup.ts"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  }
}
```

## Matches a copied Stop hook

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun .codex/hooks/workstream_closure_guard.ts"
          }
        ]
      }
    ]
  }
}
```

## Matches a prefixed canonical command

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo ready && bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  }
}
```

## Matches a suffixed canonical command

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\" || true"
          }
        ]
      }
    ]
  }
}
```

## Matches a comment-only canonical path

```json
// @filename: tools/workstream-plugin-pack/hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun copied.ts # tools/workstream-plugin-pack/hooks/workstream_startup.ts"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  }
}
```

## Matches a cross-event alternate beside the canonical command

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          },
          {
            "type": "command",
            "command": "bun .codex/hooks/workstream_startup.ts"
          }
        ]
      }
    ]
  }
}
```

## Matches a canonical Stop hook under SessionStart

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          },
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  }
}
```

## Matches a canonical SessionStart hook under Stop

```json
// @filename: tools/workstream-plugin-pack/hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          },
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ]
  }
}
```

## Ignores canonical checked-in hook relationships

```json
// @filename: tools/workstream-plugin-pack/hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      }
    ]
  }
}
```

## Ignores additional repository-owned Stop hooks

```json
// @filename: .codex/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_startup.ts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"$(git rev-parse --show-toplevel)/tools/workstream-plugin-pack/hooks/workstream_closure_guard.ts\""
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "bunx nx run habitat:check:structure"
          }
        ]
      }
    ]
  }
}
```
