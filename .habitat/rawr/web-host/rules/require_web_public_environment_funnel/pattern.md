---
level: error
tags: [web, environment, boundary, browser]
---
# Require Web Public Environment Funnel

Browser source acquires host configuration through one explicit public
environment projection. `process.env` is never a browser input.
`import.meta.env` is available only in `publicEnv.ts`, where each use must be
the direct object of a dot or bracket field access. Capturing or passing the
complete environment object remains outside the admitted relation.

```grit
language js(typescript)

// Selects JavaScript and TypeScript source under the web host source root.
predicate require_web_public_environment_funnel_is_web_source() {
  $filename <: r"(?:^|.*/)apps/web/src/.*\.[cm]?[jt]sx?$"
}

// Identifies the sole source file allowed to project public environment fields.
predicate require_web_public_environment_funnel_is_projection_source() {
  $filename <: r"(?:^|.*/)apps/web/src/ui/config/publicEnv\.ts$"
}

// Recognizes import.meta.env only when it directly selects one field.
predicate require_web_public_environment_funnel_is_direct_field_access($environment) {
  $environment <: within or {
    member_expression(object=$environment),
    subscript_expression(object=$environment)
  }
}

or {
  `process.env`,
  `process["env"]`,
  `process['env']`,
  `import.meta.env` as $environment where {
    or {
      not {
        require_web_public_environment_funnel_is_projection_source()
      },
      not {
        require_web_public_environment_funnel_is_direct_field_access(
          environment=$environment
        )
      }
    }
  }
} where {
  require_web_public_environment_funnel_is_web_source()
}
```

## Matches process environment dot access

```typescript
// @filename: apps/web/src/ui/App.tsx
const mode = process.env.NODE_ENV;
```

## Matches process environment bracket access

```typescript
// @filename: apps/web/src/ui/App.tsx
const mode = process["env"].NODE_ENV;
```

## Matches import.meta.env outside the funnel

```typescript
// @filename: apps/web/src/main.tsx
const mode = import.meta.env.MODE;
```

## Matches a bare capture inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const environment = import.meta.env;
```

## Matches destructuring inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const { MODE } = import.meta.env;
```

## Matches spreading inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const environment = { ...import.meta.env };
```

## Matches returning the complete environment inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const readEnvironment = () => import.meta.env;
```

## Matches passing the complete environment inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const environment = Object.freeze(import.meta.env);
```

## Ignores direct dot access inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const mode = import.meta.env.MODE;
```

## Ignores direct bracket access inside the funnel

```typescript
// @filename: apps/web/src/ui/config/publicEnv.ts
const mode = import.meta.env["MODE"];
```

## Ignores import.meta.url

```typescript
// @filename: apps/web/src/main.tsx
const entrypoint = import.meta.url;
```

## Ignores tests outside web source

```typescript
// @filename: apps/web/test/public-environment.test.ts
const mode = import.meta.env.MODE;
```
