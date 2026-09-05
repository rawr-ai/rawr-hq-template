import type { Tree } from "@nx/devkit";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import { stageVerifiedWrites } from "./verified-writes.js";

const optionsValidator = new Validator(
  {},
  Type.Object(
    {
      id: Type.String({
        pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$",
        maxLength: 196,
      }),
      destination: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false }
  )
);

export interface CliExtensionGeneratorOptions {
  readonly id: string;
  readonly destination: string;
}

/** Stages one standalone native Oclif extension; Nx owns publication, not activation. */
export default function createCliExtension(
  tree: Tree,
  options: CliExtensionGeneratorOptions
): void {
  if (!optionsValidator.Check(options)) {
    throw new Error("Extension options require a safe kebab-case id and an explicit destination.");
  }

  const name = `habitat-extension-${options.id}`;
  stageVerifiedWrites(tree, { root: options.destination }, [
    { path: ".gitignore", contents: "node_modules/\ndist/\n" },
    { path: "README.md", contents: readme(name, options.id) },
    {
      path: "package.json",
      contents: json({
        name,
        version: "0.1.0",
        description: "A standalone native Oclif extension",
        license: "UNLICENSED",
        type: "module",
        files: ["dist", "README.md"],
        engines: { node: "^24.18.1" },
        scripts: {
          build: "tsc -p tsconfig.json",
          typecheck: "tsc -p tsconfig.json --noEmit",
          test: "node --test test/commands.test.mjs",
        },
        dependencies: { "@oclif/core": "4.13.3" },
        devDependencies: { "@types/node": "24.13.3", typescript: "5.9.3" },
        oclif: {
          commands: {
            strategy: "explicit",
            target: "./dist/commands.js",
            identifier: "COMMANDS",
          },
        },
      }),
    },
    { path: "src/commands.ts", contents: commandSource(options.id) },
    { path: "test/commands.test.mjs", contents: commandTests(options.id) },
    {
      path: "tsconfig.json",
      contents: json({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          rootDir: "src",
          outDir: "dist",
          declaration: true,
          strict: true,
          noEmitOnError: true,
          skipLibCheck: true,
          types: ["node"],
        },
        include: ["src/**/*.ts"],
      }),
    },
  ]);
}

function json(value: object): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function commandSource(id: string): string {
  return `import { Args, Command, Flags } from "@oclif/core";

export class Hello extends Command {
  static override description = "Greet someone";
  static override args = {
    name: Args.string({ description: "Who to greet", default: "world" }),
  };
  static override flags = {
    uppercase: Flags.boolean({ char: "u", description: "Use uppercase", default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Hello);
    const greeting = "Hello, " + args.name + "!";
    this.log(flags.uppercase ? greeting.toUpperCase() : greeting);
  }
}

export const COMMANDS = { "${id}:hello": Hello };
`;
}

function commandTests(id: string): string {
  return `import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const program = \`
  import { Config, flush, handle, run } from "@oclif/core";
  let failed = false;
  let failure;
  try {
    const config = await Config.load({ root: process.cwd(), userPlugins: false, devPlugins: false });
    await run(process.argv.slice(1), config);
  } catch (error) {
    failed = true;
    failure = error;
  }
  try { await flush(); } catch (error) {
    if (!failed) { failed = true; failure = error; }
  }
  if (failed) handle(failure);
\`;

function invoke(args) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", program, "--", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", NO_COLOR: "1" },
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test("native discovery and default argument", () => {
  const result = invoke(["${id}:hello"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "Hello, world!\\n");
  assert.equal(result.stderr, "");
});

test("native argument and uppercase flag", () => {
  const result = invoke(["${id}:hello", "Ada", "--uppercase"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "HELLO, ADA!\\n");
  assert.equal(result.stderr, "");
});

test("native parser refuses an unknown flag", () => {
  const result = invoke(["${id}:hello", "--unknown"]);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Nonexistent flag: --unknown/);
});
`;
}

function readme(name: string, id: string): string {
  return `# ${name}

A standalone Oclif extension with the \`${id}:hello\` command.

## Development

Use Node.js 24.18.1 or a later compatible Node.js 24 release.

\`\`\`sh
npm install
npm run build
npm test
\`\`\`

The native command accepts an optional name (default: \`world\`) and an
\`--uppercase\` / \`-u\` flag. Tests use Oclif discovery and parsing in real
Node.js child processes.

Oclif reads the explicit \`COMMANDS\` export from \`dist/commands.js\`. No
Habitat SDK, CLI, workspace-relative import, or Nx installation is needed to
build and test this package. No Nx project registration is generated.

Generation creates source only. It does not install, link, or activate this
extension in an Oclif host. Choose publication metadata and a license before
publishing the package.
`;
}
