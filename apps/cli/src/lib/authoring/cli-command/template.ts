import {
  completeOrderedWritePlan,
  qualifiedTextWrite,
  type CompleteOrderedWritePlan,
  type VerifiedDestinationRoot,
} from "../shared";
import type { OfficialCommandAuthoringRequest } from "./request";

export function officialCommandWritePlan(
  root: VerifiedDestinationRoot,
  request: OfficialCommandAuthoringRequest
): CompleteOrderedWritePlan {
  const className = `Rawr${pascal(request.topic)}${pascal(request.name)}Command`;
  const command = `${request.topic} ${request.name}`;
  return completeOrderedWritePlan(root, [
    qualifiedTextWrite(
      `apps/cli/src/commands/${request.topic}/${request.name}.ts`,
      `import { RawrCommand } from "@rawr/core";\n\nexport default class ${className} extends RawrCommand {\n  static description = ${JSON.stringify(`Run the ${command} command`)};\n\n  static flags = {\n    ...RawrCommand.baseFlags,\n  } as const;\n\n  async run(): Promise<void> {\n    const { flags } = await this.parseRawr(${className});\n    const baseFlags = RawrCommand.extractBaseFlags(flags);\n    this.outputResult(this.ok({ command: ${JSON.stringify(command)} }), { flags: baseFlags });\n  }\n}\n`
    ),
    qualifiedTextWrite(
      `apps/cli/test/generated/${request.topic}/${request.name}.test.ts`,
      `import { spawnSync } from "node:child_process";\nimport path from "node:path";\nimport { fileURLToPath } from "node:url";\n\nimport { describe, expect, it } from "vitest";\n\nconst projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");\n\ndescribe(${JSON.stringify(command)}, () => {\n  it("returns structured JSON", () => {\n    const result = spawnSync("bun", ["test/command-fixture/command-test-cli.ts", ${JSON.stringify(request.topic)}, ${JSON.stringify(request.name)}, "--json"], {\n      cwd: projectRoot,\n      encoding: "utf8",\n      env: { ...process.env },\n    });\n    expect(result.status).toBe(0);\n    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, data: { command: ${JSON.stringify(command)} } });\n  });\n});\n`
    ),
  ]);
}

function pascal(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
}
