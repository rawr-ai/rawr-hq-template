---
level: error
---
# Require Research SDK External Neutrality

Template packages outside the research SDK may consume its neutral package root
or `contracts` surface. Source and generated Effect-bearing core, runtime, and
adapter subpaths stay inside the SDK and lane-owned compatibility consumers.
Relative imports are resolved against their importer so path normalization
cannot bypass that boundary.

```grit
language js(typescript)

or {
  import_statement(source=$source),
  export_statement(source=$source),
  `import($source)`,
  `require($source)`
} where {
  $filename <: r".*(?:apps|packages|plugins|resources|services|tools)/.*\.(?:[cm]?[jt]s|[jt]sx)$",
  not {
    $filename <: r".*packages/research-sdk/.*"
  },
  or {
    $source <: r"^[\"']@rawr/research-sdk/(?:(?:src|dist)/(?:core|runtime|adapters)|core|runtime|adapters)(?:/[^\"']*)?[\"']$",
    and {
      $source <: or {
        `"$relative"`,
        `'$relative'`
      },
      $relative <: r"^(?:\.\.?/)+.+$",
      $resolved = resolve(path=$relative),
      $resolved <: r".*/packages/research-sdk/(?:src|dist)/(?:core|runtime|adapters)(?:/.*)?$"
    }
  }
}
```
