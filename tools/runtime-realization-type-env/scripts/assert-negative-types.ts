import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const failDir = path.join(root, "fixtures", "fail");
const configPath = path.join(root, "tsconfig.fail-base.json");

function readExpectedCode(filePath: string): number {
  const source = fs.readFileSync(filePath, "utf8");
  const match = source.match(/@expected-error\s+TS(\d+)/);
  if (!match) {
    throw new Error(`${path.relative(root, filePath)} missing @expected-error TSxxxx marker`);
  }
  return Number(match[1]);
}

function loadCompilerOptions(): ts.CompilerOptions {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    {},
    configPath,
  );

  const errors = parsed.errors.filter((diagnostic) => diagnostic.code !== 18003);
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        .join("\n"),
    );
  }

  return parsed.options;
}

const options = loadCompilerOptions();
const failFiles = fs
  .readdirSync(failDir)
  .filter((fileName) => fileName.endsWith(".fail.ts"))
  .map((fileName) => path.join(failDir, fileName))
  .sort();

if (failFiles.length === 0) {
  throw new Error("no .fail.ts fixtures found");
}

const failures: string[] = [];

for (const filePath of failFiles) {
  const expectedCode = readExpectedCode(filePath);
  const program = ts.createProgram([filePath], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const codes = new Set(diagnostics.map((diagnostic) => diagnostic.code));

  if (diagnostics.length === 0) {
    failures.push(`${path.relative(root, filePath)} unexpectedly compiled`);
    continue;
  }

  if (!codes.has(expectedCode)) {
    failures.push(
      `${path.relative(root, filePath)} failed, but did not emit TS${expectedCode}; saw ${[
        ...codes,
      ]
        .sort((a, b) => a - b)
        .map((code) => `TS${code}`)
        .join(", ")}`,
    );
  }
}

if (failures.length > 0) {
  console.error("negative type assertions failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`negative type assertions passed for ${failFiles.length} fixture(s).`);
