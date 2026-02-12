# Command Frontmatter Reference

This repo uses YAML frontmatter in command Markdown files.

## Common fields

### `description` (required)

Short description shown in command lists.

### `argument-hint` (recommended)

One-line usage hint (e.g. `P=<plugin> S=<skill-name> [notes]`).

### `allowed-tools` (optional)

Restrict tool access. Use the narrowest set that still accomplishes the job.

Use a YAML array:

```yaml
allowed-tools: ["Read", "Grep", "Bash"]
```

### `model` (optional)

Pin a model only when there is a concrete reason. Prefer inheriting defaults.

### `disable-model-invocation` (optional)

Use when you want a command to be user-invoked only (no automatic invocation).

## Formatting rules

- Use a block scalar (`|`) for multi-line strings.
- Keep frontmatter minimal; prefer content in the body unless it is a runtime control.

