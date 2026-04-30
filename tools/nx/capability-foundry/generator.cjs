const INVENTORY_PATH = "tools/architecture-inventory/runtime-capability-foundry.json";

function kebabCase(input) {
  return String(input)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function pascalCase(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function camelCase(kebab) {
  const pascal = pascalCase(kebab);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

function readJson(tree, path, fallback) {
  if (!tree.exists(path)) return fallback;
  return JSON.parse(tree.read(path).toString("utf8"));
}

function writeJson(tree, path, value) {
  tree.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function projectTargets(root, projectName, capabilityName) {
  return {
    build: {
      executor: "nx:run-commands",
      options: {
        command: `tsc -p ${root}/tsconfig.json`,
      },
    },
    typecheck: {
      executor: "nx:run-commands",
      options: {
        command: `tsc -p ${root}/tsconfig.json --noEmit`,
      },
    },
    lint: {
      executor: "nx:run-commands",
      options: {
        command: `eslint --max-warnings 0 --no-error-on-unmatched-pattern "${root}/**/*.{js,jsx,ts,tsx}"`,
      },
    },
    test: {
      executor: "nx:run-commands",
      options: {
        command: `bun test ${root}/test`,
      },
    },
    sync: {
      executor: "nx:run-commands",
      options: {
        command: `bun run sync:check --project ${projectName}`,
      },
    },
    structural: {
      executor: "nx:run-commands",
      options: {
        command: `bun scripts/runtime-prod/verify-capability-foundry-slice.mjs --name ${capabilityName}`,
      },
    },
  };
}

function writeService(tree, model) {
  const root = `services/${model.kebab}`;
  writeJson(tree, `${root}/package.json`, {
    name: `@rawr/${model.kebab}`,
    private: true,
    type: "module",
    packageManager: "bun@1.3.7",
    main: "./src/index.ts",
    types: "./src/index.ts",
    exports: {
      ".": {
        types: "./src/index.ts",
        default: "./src/index.ts",
      },
    },
    dependencies: {
      "@rawr/sdk": "workspace:*",
    },
    devDependencies: {
      "@types/bun": "^1.2.10",
      typescript: "^5.9.3",
    },
  });

  writeJson(tree, `${root}/project.json`, {
    $schema: "../../node_modules/nx/schemas/project-schema.json",
    name: `@rawr/${model.kebab}`,
    root,
    sourceRoot: `${root}/src`,
    tags: [
      "type:service",
      "role:servicepackage",
      "migration-slice:runtime-production",
      `capability:${model.kebab}`,
    ],
    targets: projectTargets(root, `@rawr/${model.kebab}`, model.kebab),
  });

  writeJson(tree, `${root}/tsconfig.json`, {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      types: ["bun", "node"],
    },
    include: ["src", "test"],
  });

  tree.write(
    `${root}/src/index.ts`,
    `import { defineService } from "@rawr/sdk/service";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";

export const ${model.pascal}Service = defineService({
  id: "${model.kebab}",
  config: RuntimeSchema.struct(
    {
      prefix: RuntimeSchema.string({ id: "${model.kebab}.config.prefix" }),
    },
    { id: "${model.kebab}.config" },
  ),
  metadataDefaults: {
    capability: "${model.kebab}",
    generatedBy: "capability-foundry",
  },
});

export interface ${model.pascal}PingInput {
  readonly message: string;
}

export interface ${model.pascal}PingOutput {
  readonly ok: true;
  readonly capability: "${model.kebab}";
  readonly message: string;
}

export function create${model.pascal}Client(input: { readonly prefix?: string } = {}) {
  const prefix = input.prefix ?? "${model.kebab}";
  return {
    ping(request: ${model.pascal}PingInput): ${model.pascal}PingOutput {
      return {
        ok: true,
        capability: "${model.kebab}",
        message: \`\${prefix}:\${request.message}\`,
      };
    },
  };
}

export type ${model.pascal}Client = ReturnType<typeof create${model.pascal}Client>;
`,
  );

  tree.write(
    `${root}/test/service.test.ts`,
    `import { describe, expect, it } from "bun:test";
import { ${model.pascal}Service, create${model.pascal}Client } from "../src";

describe("@rawr/${model.kebab}", () => {
  it("keeps generated service metadata and client behavior stable", () => {
    expect(${model.pascal}Service.kind).toBe("service.definition");
    expect(${model.pascal}Service.id).toBe("${model.kebab}");
    expect(create${model.pascal}Client().ping({ message: "ready" })).toEqual({
      ok: true,
      capability: "${model.kebab}",
      message: "${model.kebab}:ready",
    });
  });
});
`,
  );
}

function writeServerPlugin(tree, model) {
  const root = `plugins/server/api/${model.kebab}`;
  writeJson(tree, `${root}/package.json`, {
    name: `@rawr/plugin-server-api-${model.kebab}`,
    private: true,
    type: "module",
    packageManager: "bun@1.3.7",
    main: "./index.ts",
    types: "./index.ts",
    exports: {
      ".": {
        types: "./index.ts",
        default: "./index.ts",
      },
      "./server": {
        types: "./server.ts",
        default: "./server.ts",
      },
    },
    rawr: {
      kind: "api",
      capability: model.kebab,
      generatedBy: "capability-foundry",
    },
    dependencies: {
      [`@rawr/${model.kebab}`]: "workspace:*",
      "@rawr/sdk": "workspace:*",
    },
    devDependencies: {
      "@types/bun": "^1.2.10",
      typescript: "^5.9.3",
    },
  });

  writeJson(tree, `${root}/project.json`, {
    $schema: "../../../../node_modules/nx/schemas/project-schema.json",
    name: `plugin-server-api-${model.kebab}`,
    root,
    sourceRoot: `${root}/src`,
    tags: [
      "type:plugin",
      "migration-slice:runtime-production",
      "role:server",
      "surface:api",
      `capability:${model.kebab}`,
    ],
    targets: projectTargets(root, `plugin-server-api-${model.kebab}`, model.kebab),
  });

  writeJson(tree, `${root}/tsconfig.json`, {
    extends: "../../../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      types: ["bun", "node"],
    },
    include: ["index.ts", "server.ts", "src", "test"],
  });

  tree.write(`${root}/index.ts`, `export * from "./src";\n`);
  tree.write(`${root}/server.ts`, `export * from "./src/server";\n`);
  tree.write(
    `${root}/src/index.ts`,
    `export * from "./server";
`,
  );
  tree.write(
    `${root}/src/server.ts`,
    `import { ${model.pascal}Service } from "@rawr/${model.kebab}";
import { defineServerApiPlugin, useService } from "@rawr/sdk/plugins/server";

export const ${model.pascal}ServerApiPlugin = defineServerApiPlugin({
  capability: "${model.kebab}",
  routeBase: "/${model.kebab}",
  services: {
    ${model.camel}: useService(${model.pascal}Service),
  },
  api: () => ({
    ping: {
      method: "POST",
      path: "/${model.kebab}/ping",
      service: "${model.camel}",
    },
  }),
});

export function register${model.pascal}ServerApiPlugin() {
  return ${model.pascal}ServerApiPlugin;
}

export type ${model.pascal}ServerApiPluginRegistration = ReturnType<typeof register${model.pascal}ServerApiPlugin>;
`,
  );

  tree.write(
    `${root}/test/server.test.ts`,
    `import { describe, expect, it } from "bun:test";
import { register${model.pascal}ServerApiPlugin } from "../server";

describe("@rawr/plugin-server-api-${model.kebab}", () => {
  it("declares a cold server API projection for the capability", () => {
    const plugin = register${model.pascal}ServerApiPlugin();
    expect(plugin.kind).toBe("plugin.server");
    expect(plugin.surface).toBe("api");
    expect(plugin.capability).toBe("${model.kebab}");
    expect(plugin.importSafety).toBe("cold-declaration");
    expect(Object.keys(plugin.services)).toEqual(["${model.camel}"]);
  });
});
`,
  );
}

function writeAsyncPlugin(tree, model) {
  const root = `plugins/async/workflows/${model.kebab}`;
  writeJson(tree, `${root}/package.json`, {
    name: `@rawr/plugin-async-workflow-${model.kebab}`,
    private: true,
    type: "module",
    packageManager: "bun@1.3.7",
    main: "./index.ts",
    types: "./index.ts",
    exports: {
      ".": {
        types: "./index.ts",
        default: "./index.ts",
      },
      "./workflow": {
        types: "./workflow.ts",
        default: "./workflow.ts",
      },
    },
    rawr: {
      kind: "workflow",
      capability: model.kebab,
      generatedBy: "capability-foundry",
    },
    dependencies: {
      [`@rawr/${model.kebab}`]: "workspace:*",
      "@rawr/sdk": "workspace:*",
    },
    devDependencies: {
      "@types/bun": "^1.2.10",
      typescript: "^5.9.3",
    },
  });

  writeJson(tree, `${root}/project.json`, {
    $schema: "../../../../node_modules/nx/schemas/project-schema.json",
    name: `plugin-async-workflow-${model.kebab}`,
    root,
    sourceRoot: `${root}/src`,
    tags: [
      "type:plugin",
      "migration-slice:runtime-production",
      "role:async",
      "surface:workflow",
      `capability:${model.kebab}`,
    ],
    targets: projectTargets(root, `plugin-async-workflow-${model.kebab}`, model.kebab),
  });

  writeJson(tree, `${root}/tsconfig.json`, {
    extends: "../../../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      types: ["bun", "node"],
    },
    include: ["index.ts", "workflow.ts", "src", "test"],
  });

  tree.write(`${root}/index.ts`, `export * from "./src";\n`);
  tree.write(`${root}/workflow.ts`, `export * from "./src/workflow";\n`);
  tree.write(
    `${root}/src/index.ts`,
    `export * from "./workflow";
`,
  );
  tree.write(
    `${root}/src/workflow.ts`,
    `import { ${model.pascal}Service } from "@rawr/${model.kebab}";
import { defineAsyncWorkflowPlugin, defineWorkflow, useService } from "@rawr/sdk/plugins/async";

export const ${model.pascal}Workflow = defineWorkflow({
  id: "${model.kebab}.sync",
  async run() {
    return {
      ok: true,
      capability: "${model.kebab}",
    };
  },
});

export const ${model.pascal}WorkflowPlugin = defineAsyncWorkflowPlugin({
  capability: "${model.kebab}",
  services: {
    ${model.camel}: useService(${model.pascal}Service),
  },
  workflows: [${model.pascal}Workflow],
});

export function register${model.pascal}WorkflowPlugin() {
  return ${model.pascal}WorkflowPlugin;
}

export type ${model.pascal}WorkflowPluginRegistration = ReturnType<typeof register${model.pascal}WorkflowPlugin>;
`,
  );

  tree.write(
    `${root}/test/workflow.test.ts`,
    `import { describe, expect, it } from "bun:test";
import { register${model.pascal}WorkflowPlugin } from "../workflow";

describe("@rawr/plugin-async-workflow-${model.kebab}", () => {
  it("declares a cold async workflow projection for the capability", () => {
    const plugin = register${model.pascal}WorkflowPlugin();
    expect(plugin.kind).toBe("plugin.async-workflow");
    expect(plugin.capability).toBe("${model.kebab}");
    expect(plugin.importSafety).toBe("cold-declaration");
    expect(plugin.workflows?.map((workflow) => workflow.id)).toEqual(["${model.kebab}.sync"]);
  });
});
`,
  );
}

function updateInventory(tree, model) {
  const inventory = readJson(tree, INVENTORY_PATH, { projects: {} });
  inventory.projects[`@rawr/${model.kebab}`] = {
    config: `services/${model.kebab}/project.json`,
    tags: [
      "type:service",
      "role:servicepackage",
      "migration-slice:runtime-production",
      `capability:${model.kebab}`,
    ],
    targets: ["build", "sync", "structural", "typecheck", "test"],
  };
  inventory.projects[`plugin-server-api-${model.kebab}`] = {
    config: `plugins/server/api/${model.kebab}/project.json`,
    tags: [
      "type:plugin",
      "migration-slice:runtime-production",
      "role:server",
      "surface:api",
      `capability:${model.kebab}`,
    ],
    targets: ["sync", "structural", "typecheck", "test"],
  };
  inventory.projects[`plugin-async-workflow-${model.kebab}`] = {
    config: `plugins/async/workflows/${model.kebab}/project.json`,
    tags: [
      "type:plugin",
      "migration-slice:runtime-production",
      "role:async",
      "surface:workflow",
      `capability:${model.kebab}`,
    ],
    targets: ["sync", "structural", "typecheck", "test"],
  };
  writeJson(tree, INVENTORY_PATH, inventory);
}

function updateRootScripts(tree, model) {
  const rootPackage = readJson(tree, "package.json", {});
  rootPackage.scripts = {
    ...(rootPackage.scripts ?? {}),
    "runtime-prod:gate:capability-foundry": `bun scripts/runtime-prod/verify-capability-foundry-slice.mjs --name ${model.kebab}`,
  };
  writeJson(tree, "package.json", rootPackage);
}

module.exports = async function capabilityFoundry(tree, options) {
  const kebab = kebabCase(options.name);
  if (!kebab) throw new Error("capability-foundry requires a non-empty name");
  const model = {
    kebab,
    pascal: pascalCase(kebab),
    camel: camelCase(kebab),
  };

  writeService(tree, model);
  writeServerPlugin(tree, model);
  writeAsyncPlugin(tree, model);
  updateInventory(tree, model);
  updateRootScripts(tree, model);
};
