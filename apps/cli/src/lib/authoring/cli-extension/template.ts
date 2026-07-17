import {
  completeOrderedWritePlan,
  qualifiedTextWrite,
  type CompleteOrderedWritePlan,
  type VerifiedDestinationRoot,
} from "../shared";
import type { ExternalExtensionAuthoringRequest } from "./request";

export function externalExtensionWritePlan(
  root: VerifiedDestinationRoot,
  request: ExternalExtensionAuthoringRequest,
): CompleteOrderedWritePlan {
  const packageName = `rawr-cli-extension-${request.extensionId}`;
  const className = `Rawr${pascal(request.extensionId)}Hello`;
  return completeOrderedWritePlan(root, [
    qualifiedTextWrite("README.md", `# ${packageName}\n\nPortable external Oclif extension source. Build and test it locally, then use the explicit \`rawr plugins\` lifecycle commands when activation is intended.\n`),
    qualifiedTextWrite("package.json", `${JSON.stringify({
      name: packageName,
      version: "0.1.0",
      private: true,
      type: "module",
      files: ["dist", "README.md", "package.json"],
      engines: { node: ">=20.0.0" },
      dependencies: { "@oclif/core": "^4.8.0" },
      devDependencies: {
        "@types/node": "^22.14.0",
        typescript: "^5.9.3",
        vitest: "^4.0.18",
      },
      oclif: {
        commands: "./dist/commands",
        topicSeparator: " ",
        typescript: { commands: "./src/commands" },
      },
      scripts: {
        build: "tsc -p tsconfig.json",
        test: "vitest run --config vitest.config.ts",
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
    }, null, 2)}\n`),
    qualifiedTextWrite(`src/commands/${request.extensionId}/hello.ts`, `import { Command } from "@oclif/core";\n\nexport default class ${className} extends Command {\n  static description = ${JSON.stringify(`Say hello from ${packageName}`)};\n\n  async run(): Promise<void> {\n    this.log(${JSON.stringify(`hello from ${request.extensionId}`)});\n  }\n}\n`),
    qualifiedTextWrite(`test/${request.extensionId}-hello.test.ts`, `import { describe, expect, it } from "vitest";\n\nimport ${className} from "../src/commands/${request.extensionId}/hello";\n\ndescribe(${JSON.stringify(`${request.extensionId} hello`)}, () => {\n  it("declares an external Oclif command", () => {\n    expect(${className}.description).toContain(${JSON.stringify(packageName)});\n  });\n});\n`),
    qualifiedTextWrite("tsconfig.json", `${JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        declaration: true,
        outDir: "dist",
        strict: true,
        skipLibCheck: true,
        types: ["node"],
      },
      include: ["src"],
    }, null, 2)}\n`),
    qualifiedTextWrite("vitest.config.ts", `import { defineConfig } from "vitest/config";\n\nexport default defineConfig({\n  test: { environment: "node", include: ["test/**/*.test.ts"] },\n});\n`),
  ]);
}

function pascal(value: string): string {
  return value.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");
}
