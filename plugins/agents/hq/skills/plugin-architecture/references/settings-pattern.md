# Settings Pattern: `.claude/<plugin>.local.md`

Use per-project settings to tune plugin behavior without code changes.

## Convention

- Store settings under the project's `.claude/` directory.
- Use a plugin-specific `*.local.md` filename.
- Put structured settings in YAML frontmatter.
- Put long-form notes or prompts in the markdown body.

## Reading rules (host-agnostic)

1. If the file does not exist: treat the plugin as not configured.
2. Parse YAML frontmatter.
3. Apply an early `enabled` gate when present.

