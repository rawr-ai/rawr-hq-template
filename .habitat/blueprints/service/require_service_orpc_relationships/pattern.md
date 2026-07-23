---
level: error
tags: [orpc, service, relationship]
---
# Require Service oRPC Relationships

A service has one contract-first oRPC lineage. Generic root and module anchors
carry canonical module branches through contract composition, one root
implementer, independently decorated native middleware, narrow execution
context, and router composition. The root implementation may compose module
contracts and routers through their exact composition anchors; it may not pull
module logic, repositories, providers, or models upward. Module implementations
may consume service-owned execution capabilities but may not reach sideways
into a sibling module.

Service-versus-module dependency ownership is a semantic design decision, not
a file-count heuristic this rule can infer. A capability that contextualizes,
bounds, or admits the service can legitimately be service-owned even before a
second module consumes it. A capability that realizes one module's lifecycle
belongs with that module. This packet enforces the resulting import and oRPC
relations; review owns the responsibility decision. Contract schema, public
error, and literal import-spelling ownership live in their own coherent packets
rather than being repeated here.

When a module is large enough to split procedure handlers, `router/index.ts`
exports one plain router map. The module's root `router.ts` imports that map as
`procedures` and remains the boundary that applies `module.router(procedures)`;
the interior does not create another oRPC module or service face. The pinned
Grit engine can validate an authored sibling import and its use but cannot
prove a non-emitting cross-file absence relation. Review therefore owns
complete optional-interior participation as an explicit native-tool gap.

The Grit CLI's `multifile` construct is a sequential rewrite pipeline: every
collection step is itself emitted as a diagnostic. It therefore cannot prove a
zero-diagnostic repository-wide absence or use-count relation. This rule does
not pretend otherwise. It proves the exact within-file lineage at every root
import and module branch, while Habitat structure proves that every module has
the required anchor files. A module file that exists but is never imported by
either root composer remains an explicit native-tool gap until Grit supports
non-emitting multifile predicates.

```grit
language js(typescript)

function camel_case($value) js {
  return $value.text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function crosses_into_sibling_module($filename, $source) js {
  const filename = $filename.text;
  const rawSource = $source.text;
  const marker = "src/service/modules/";
  const currentModule = filename
    .slice(filename.indexOf(marker) + marker.length)
    .split("/")[0];
  const source = rawSource.slice(1, -1);
  const targetSegments = source.startsWith(".")
    ? source.split("/").reduce(
        (path, segment) => segment === ".."
          ? path.slice(0, -1)
          : segment === "." || segment === ""
            ? path
            : path.concat(segment),
        filename.split("/").slice(0, -1),
      )
    : source.split("/");
  const match = targetSegments.join("/").match(/(?:^|\/)modules\/([^/]+)/);
  return match && match[1] !== currentModule ? "true" : "false";
}

private pattern forbidden_context_access($context) {
  or {
    `$context.$authority` where {
      $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
    },
    `$context[$authority]` where {
      $authority <: r"^[\"'](?:deps|request|authenticatedRequest|auth)[\"']$"
    },
    `($context as $type).$authority` where {
      $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
    },
    variable_declarator(name=$binding, value=$value) where {
      or {
        $value <: $context,
        $value <: `($context)`,
        $value <: `$context as $type`,
        $value <: `($context as $type)`,
        $value <: `$context!`,
        $value <: `($context!)`,
        $value <: `<$type>$context`,
        $value <: `$context satisfies $type`
      },
      or {
        $binding <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
        $binding <: `{ $..., $authority, $... }` where {
          $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
        },
        $binding <: `{ $..., $authority: $alias, $... }` where {
          $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
        }
      }
    },
    variable_declarator(name=$binding, value=$value) where {
      $value <: non_null_expression(),
      $value <: contains $context
    },
    assignment_expression(left=$binding, right=$value) where {
      $binding <: r"^[A-Za-z_$][A-Za-z0-9_$]*$",
      or {
        $value <: $context,
        $value <: `($context)`,
        $value <: `$context as $type`,
        $value <: `($context as $type)`,
        $value <: `$context!`,
        $value <: `($context!)`,
        $value <: `<$type>$context`,
        $value <: `$context satisfies $type`
      }
    },
    assignment_expression(left=$binding, right=$value) where {
      $value <: non_null_expression(),
      $value <: contains $context
    }
  }
}

predicate is_native_implementer($implementer) {
  or {
    and {
      $implementer <: `implementEffect`,
      $program <: contains or {
        `import { $..., implementEffect, $... } from "effect-orpc"`,
        `import { $..., implementEffect, $... } from 'effect-orpc'`
      }
    },
    $program <: contains or {
      `import { $..., implementEffect as $implementer, $... } from "effect-orpc"`,
      `import { $..., implementEffect as $implementer, $... } from 'effect-orpc'`
    },
    and {
      $implementer <: `implement`,
      $program <: contains or {
        `import { $..., implement, $... } from "@orpc/server"`,
        `import { $..., implement, $... } from '@orpc/server'`
      }
    },
    $program <: contains or {
      `import { $..., implement as $implementer, $... } from "@orpc/server"`,
      `import { $..., implement as $implementer, $... } from '@orpc/server'`
    }
  }
}

predicate is_service_anchor_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|impl|router|modules/[^/]+/(?:contract|module|router))\.ts$"
}

predicate is_root_service_implementation_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
  ! $filename <: r".*/src/service/modules/.*",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

predicate is_module_implementation_file() {
  $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/.*\.ts$",
  ! $filename <: r".*/(?:test|tests|__tests__)/.*"
}

predicate is_exact_root_module_composition_import($source) {
  or {
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
      $source <: r"^[\"']\./modules/[^/]+/contract[\"']$"
    },
    and {
      $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
      $source <: r"^[\"']\./modules/[^/]+/router[\"']$"
    }
  }
}

or {
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:contract|modules/[^/]+/contract)\.ts$",
    not {
      or {
        $body <: contains `export const contract = $value`,
        and {
          $body <: contains `const contract = $value`,
          $body <: contains `export { contract }`
        }
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
    not {
      or {
        $body <: contains `export const service = $value`,
        and {
          $body <: contains `const service = $value`,
          $body <: contains `export { service }`
        }
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:router|modules/[^/]+/router)\.ts$",
    not {
      or {
        $body <: contains `export const router = $value`,
        and {
          $body <: contains `const router = $value`,
          $body <: contains `export { router }`
        }
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/module\.ts$",
    not {
      or {
        $body <: contains `export const module = $value`,
        and {
          $body <: contains `const module = $value`,
          $body <: contains `export { module }`
        }
      }
    }
  },
  `export const $name = $value` where {
    $filename <: r".*/src/service/(?:contract|modules/[^/]+/contract)\.ts$",
    ! $name <: `contract`
  },
  `export const $name = $value` where {
    $filename <: r".*/src/service/impl\.ts$",
    ! $name <: `service`
  },
  `export const $name = $value` where {
    $filename <: r".*/src/service/(?:router|modules/[^/]+/router)\.ts$",
    ! $name <: `router`
  },
  `export const $name = $value` where {
    $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
    ! $name <: `module`
  },
  or {
    `export let $name = $value`,
    `export var $name = $value`,
    `export function $name($args) { $body }`,
    `export class $name { $body }`,
    `export type $name = $value`,
    `export interface $name { $body }`,
    `export enum $name { $body }`
  } where {
    is_service_anchor_file(),
    $name <: r".+"
  },
  `export { $exports }` as $export where {
    $filename <: r".*/src/service/(?:contract|modules/[^/]+/contract)\.ts$",
    ! $export <: `export { contract }`
  },
  `export { $exports }` as $export where {
    $filename <: r".*/src/service/impl\.ts$",
    ! $export <: `export { service }`
  },
  `export { $exports }` as $export where {
    $filename <: r".*/src/service/(?:router|modules/[^/]+/router)\.ts$",
    ! $export <: `export { router }`
  },
  `export { $exports }` as $export where {
    $filename <: r".*/src/service/modules/[^/]+/module\.ts$",
    ! $export <: `export { module }`
  },
  `export { $exports } from $source` where {
    is_service_anchor_file(),
    $source <: r".+"
  },
  `export * from $source` where {
    is_service_anchor_file(),
    $source <: r".+"
  },
  `export default $value` where {
    is_service_anchor_file()
  },
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/contract\.ts$",
    not {
      $body <: contains or {
        `import { $..., eoc as $builder, $... } from "effect-orpc"`,
        `import { $..., eoc as $builder, $... } from 'effect-orpc'`
      },
      $body <: contains `const contract = $builder.router($definition)`
    },
    not {
      $body <: contains or {
        `import { $..., eoc, $... } from "effect-orpc"`,
        `import { $..., eoc, $... } from 'effect-orpc'`
      },
      $body <: contains `const contract = eoc.router($definition)`
    }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/contract\.ts$",
    not {
      $body <: contains or {
        `import { $..., oc as $builder, $... } from "@orpc/contract"`,
        `import { $..., oc as $builder, $... } from '@orpc/contract'`
      },
      $body <: contains `const contract = $builder.router($definition)`
    },
    not {
      $body <: contains or {
        `import { $..., oc, $... } from "@orpc/contract"`,
        `import { $..., oc, $... } from '@orpc/contract'`
      },
      $body <: contains `const contract = oc.router($definition)`
    }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
    $source <: r"^[\"']\./modules/([^/]+)/contract[\"']$"($module_name),
    $import <: `import { contract as $alias } from $source`,
    $expected = camel_case(value=$module_name),
    or {
      ! $alias <: r`$expected`,
      not {
        or {
          $program <: contains `const contract = $builder.router({ $..., $alias, $... })`,
          $program <: contains `const contract = $builder.router({ $..., $key: $alias, $... })` where {
            $key <: r`$expected`
          }
        }
      }
    }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
    $source <: r"^[\"']\./modules/[^/]+/contract[\"']$",
    not { $import <: `import { contract as $alias } from $source` }
  },
  import_statement(source=$source) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/contract\.ts$",
    $source <: r"^[\"'].*modules/[^/]+/contract[\"']$",
    ! $source <: r"^[\"']\./modules/[^/]+/contract[\"']$"
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
    not { $body <: contains `import { contract } from "./contract"` },
    not { $body <: contains `import { contract } from './contract'` }
  },
  program(statements=$body) where {
    $filename <: r".*services/[^/]+/src/service/impl\.ts$",
    not {
      or {
        and {
          $body <: contains or {
            `import { $..., implementEffect, $... } from "effect-orpc"`,
            `import { $..., implementEffect, $... } from 'effect-orpc'`
          },
          $body <: contains `implementEffect(contract, $...)`
        },
        and {
          $body <: contains or {
            `import { $..., implementEffect as $implementer, $... } from "effect-orpc"`,
            `import { $..., implementEffect as $implementer, $... } from 'effect-orpc'`
          },
          $body <: contains `$implementer(contract, $...)`
        }
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*plugins/server/api/[^/]+/src/service/impl\.ts$",
    not {
      or {
        and {
          $body <: contains or {
            `import { $..., implement, $... } from "@orpc/server"`,
            `import { $..., implement, $... } from '@orpc/server'`
          },
          $body <: contains `implement(contract, $...)`
        },
        and {
          $body <: contains or {
            `import { $..., implement as $implementer, $... } from "@orpc/server"`,
            `import { $..., implement as $implementer, $... } from '@orpc/server'`
          },
          $body <: contains `$implementer(contract, $...)`
        }
      }
    }
  },
  `$implementer($argument, $...)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
    is_native_implementer(implementer=$implementer),
    ! $argument <: `contract`
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
    $calls = [],
    $body <: some bubble($calls) $statement where {
      $statement <: contains bubble($calls) `$implementer($argument, $...)` as $call where {
        is_native_implementer(implementer=$implementer),
        $calls += $call
      }
    },
    $call_count = length(target=$calls),
    ! $call_count <: 1
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$",
    not {
      or {
        $body <: contains `const service = $value` where {
          $value <: contains `$implementer(contract, $...)` where {
            is_native_implementer(implementer=$implementer)
          }
        },
        and {
          $body <: contains `const $base = $value` where {
            $value <: contains `$implementer(contract, $...)` where {
              is_native_implementer(implementer=$implementer)
            }
          },
          $body <: contains `const service = $service_value` where {
            $service_value <: contains `$base`
          }
        }
      }
    }
  },
  `$implementer($args)` where {
    is_native_implementer(implementer=$implementer),
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    ! $filename <: r".*/src/service/impl\.ts$"
  },
  `$target.$context<$context_type>($args)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
  },
  `$target.$context($args)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/impl\.ts$"
  },
  import_statement(source=$source) where {
    is_root_service_implementation_file(),
    $source <: r"modules/",
    not { is_exact_root_module_composition_import(source=$source) }
  },
  import_statement(source=$source) where {
    is_module_implementation_file(),
    $crosses = crosses_into_sibling_module(filename=$filename, source=$source),
    $crosses <: r"^true$"
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/contract\.ts$",
    not { $body <: contains `const contract = $definition` }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/([^/]+)/module\.ts$"($module_name),
    $expected = camel_case(value=$module_name),
    not {
      $body <: contains or {
        `import { service } from "../../impl"`,
        `import { service } from '../../impl'`
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/([^/]+)/module\.ts$"($module_name),
    $expected = camel_case(value=$module_name),
    not {
      or {
        $body <: contains `const module = $value` where {
          $value <: contains `service.$branch` where { $branch <: r`$expected` }
        },
        and {
          $body <: contains `const $inherited = $value` where {
            $value <: contains `service.$branch` where { $branch <: r`$expected` }
          },
          $body <: contains `const module = $module_value` where {
            $module_value <: contains `$inherited`
          }
        }
      }
    }
  },
  `$target.use($middleware)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/.*\.ts$",
    not { $middleware <: contains `$builder.middleware($handler)` },
    not {
      $program <: contains `const $middleware = $value` where {
        $value <: contains `$builder.middleware($handler)`
      }
    },
    not {
      $program <: contains `import { $..., $middleware, $... } from $source`,
      $source <: r"^[\"'].*middleware(?:/[^\"']+)?[\"']$"
    },
    not {
      $program <: contains `import { $..., $imported as $middleware, $... } from $source`,
      $source <: r"^[\"'].*middleware(?:/[^\"']+)?[\"']$"
    }
  },
  `export const $middleware = $value` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
    ! $filename <: r".*/middleware/index\.ts$",
    not { $value <: contains `$builder.middleware($handler)` }
  },
  `export function $middleware($args) { $body }` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
    ! $filename <: r".*/middleware/index\.ts$"
  },
  `export { $exports }` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
    ! $filename <: r".*/middleware/index\.ts$"
  },
  `export { $exports } from $source` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$",
    ! $filename <: r".*/middleware/index\.ts$"
  },
  `export default $value` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/.*\.ts$"
  },
  `export { $exports }` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/index\.ts$"
  },
  `export { $exports } from $source` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/index\.ts$",
    ! $source <: r"^[\"']\./[^\"']+[\"']$"
  },
  `export * from $source` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/(?:middleware|modules/[^/]+/middleware)/index\.ts$"
  },
  import_statement(source=$source) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/.*\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $source <: r"^[\"']?(?:(?:\.\./)+|#[^\"']*(?:-service|/service)/)(?:base|context)(?:\.[cm]?[jt]s)?[\"']?$"
  },
  `$procedure.handler($callback)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    not {
      $callback <: or {
        `({ $parameters }) => $body`,
        `async ({ $parameters }) => $body`,
        `function ({ $parameters }) { $body }`,
        `async function ({ $parameters }) { $body }`
      }
    }
  },
  `$procedure.effect(function* ({ $..., context, $... }) { $body })` where {
    $filename <: r".*services/[^/]+/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      $body <: contains forbidden_context_access(context=`context`),
      $body <: contains `context!.$authority` where {
        $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
      }
    }
  },
  `$procedure.effect(function* ({ $..., context: $context, $... }) { $body })` where {
    $filename <: r".*services/[^/]+/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    or {
      $body <: contains forbidden_context_access(context=$context),
      $body <: contains `$context!.$authority` where {
        $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
      }
    }
  },
  `$procedure.effect($callback)` where {
    $filename <: r".*services/[^/]+/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $callback <: or {
      `function* ({ $..., context: { $..., $authority, $... }, $... }) { $body }`,
      `function* ({ $..., context: { $..., $authority: $alias, $... }, $... }) { $body }`
    },
    $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
  },
  `$procedure.handler($callback)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $callback <: or {
      `({ $..., context, $... }) => $body`,
      `async ({ $..., context, $... }) => $body`,
      `function ({ $..., context, $... }) { $body }`,
      `async function ({ $..., context, $... }) { $body }`
    },
    or {
      $body <: contains forbidden_context_access(context=`context`),
      $body <: contains `context!.$authority` where {
        $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
      }
    }
  },
  `$procedure.handler($callback)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $callback <: or {
      `({ $..., context: $context, $... }) => $body`,
      `async ({ $..., context: $context, $... }) => $body`,
      `function ({ $..., context: $context, $... }) { $body }`,
      `async function ({ $..., context: $context, $... }) { $body }`
    },
    or {
      $body <: contains forbidden_context_access(context=$context),
      $body <: contains `$context!.$authority` where {
        $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
      }
    }
  },
  `$procedure.handler($callback)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/(?:router|router/[^/]+)\.ts$",
    ! $filename <: r".*/(?:test|tests|__tests__)/.*",
    $callback <: or {
      `({ $..., context: { $..., $authority, $... }, $... }) => $body`,
      `async ({ $..., context: { $..., $authority, $... }, $... }) => $body`,
      `function ({ $..., context: { $..., $authority, $... }, $... }) { $body }`,
      `async function ({ $..., context: { $..., $authority, $... }, $... }) { $body }`,
      `({ $..., context: { $..., $authority: $alias, $... }, $... }) => $body`,
      `async ({ $..., context: { $..., $authority: $alias, $... }, $... }) => $body`,
      `function ({ $..., context: { $..., $authority: $alias, $... }, $... }) { $body }`,
      `async function ({ $..., context: { $..., $authority: $alias, $... }, $... }) { $body }`
    },
    $authority <: r"^(?:deps|request|authenticatedRequest|auth)$"
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
    $source <: r"^[\"']\./modules/([^/]+)/router[\"']$"($module_name),
    $import <: `import { router as $alias } from $source`,
    $expected = camel_case(value=$module_name),
    or {
      ! $alias <: r`$expected`,
      not {
        or {
          $program <: contains `const router = service.router({ $..., $alias, $... })`,
          $program <: contains `const router = service.router({ $..., $key: $alias, $... })` where {
            $key <: r`$expected`
          }
        }
      }
    }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
    $source <: r"^[\"']\./modules/[^/]+/router[\"']$",
    not { $import <: `import { router as $alias } from $source` }
  },
  import_statement(source=$source) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
    $source <: r"^[\"'].*modules/[^/]+/router[\"']$",
    ! $source <: r"^[\"']\./modules/[^/]+/router[\"']$"
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
    not {
      $body <: contains or {
        `import { service } from "./impl"`,
        `import { service } from './impl'`
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/router\.ts$",
    not { $body <: contains `const router = service.router($definition)` }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    not {
      $body <: contains or {
        `import { module } from "./module"`,
        `import { module } from './module'`
      }
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    not { $body <: contains `const router = module.router($definition)` }
  },
  import_statement(source=$source) as $import where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router\.ts$",
    $source <: r"^[\"']\./router(?:/index)?[\"']$",
    not {
      $source <: r"^[\"']\./router/index[\"']$",
      $import <: `import { router as procedures } from $source`,
      $program <: contains `const router = module.router(procedures)`
    }
  },
  program(statements=$body) where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$",
    not {
      or {
        $body <: contains `export const router = { $... }`,
        and {
          $body <: contains `const router = { $... }`,
          $body <: contains `export { router }`
        }
      }
    }
  },
  `$target.router($definition)` where {
    $filename <: r".*(?:services/[^/]+|plugins/server/api/[^/]+)/src/service/modules/[^/]+/router/index\.ts$"
  }

}
```


## Matches root-context access in a leaf

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = module.router({
  find: module.find.effect(function* ({ context }) {
    return yield* context.deps.jobs.find();
  }),
});
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = module.router({
  find: module.find.effect(function* ({ context }) {
    return yield* context.deps.jobs.find();
  }),
});
```

## Ignores projected execution context

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = module.router({
  find: module.find.effect(function* ({ context }) {
    return yield* context.jobs.find();
  }),
});
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
export const router = module.router({
  find: module.find.effect(function* ({ context }) {
    return yield* context.jobs.find();
  }),
});
```

## Matches an unused interior router map

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
import { router as procedures } from "./router/index";

export const router = module.router({});
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
import { router as procedures } from "./router/index";

export const router = module.router({});
```

## Ignores a composed interior router map

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
import { router as procedures } from "./router/index";

export const router = module.router(procedures);
```

```typescript
// @filename: services/jobs/src/service/modules/catalog/router.ts
import { module } from "./module";
import { router as procedures } from "./router/index";

export const router = module.router(procedures);
```
