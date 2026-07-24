#!/usr/bin/env bun
import path from "node:path";
import { ESLint } from "eslint";

const workspaceRoot = process.cwd();
const fixtureRoot = path.join(workspaceRoot, "tools", "eslint-fixtures");
const boundaryRule = "@nx/enforce-module-boundaries";
const positiveFixtures = [
  "positive-service-imports-package.ts",
  "positive-service-private-alias.ts",
];
const negativeFixtures = [
  "negative-package-imports-service.ts",
  "negative-plugin-imports-plugin.ts",
  "negative-service-imports-app.ts",
];
const fixturePaths = [...positiveFixtures, ...negativeFixtures].map((fileName) =>
  path.join(fixtureRoot, fileName)
);

const eslint = new ESLint({ cwd: workspaceRoot, errorOnUnmatchedPattern: true });
const results = await eslint.lintFiles(fixturePaths);
const resultsByPath = new Map(results.map((result) => [path.resolve(result.filePath), result]));
const failures = [];

function formatMessages(messages) {
  return messages
    .map((message) => {
      const ruleId = message.ruleId ?? "fatal";
      return `${message.line}:${message.column} ${ruleId}: ${message.message}`;
    })
    .join("; ");
}

for (const fileName of positiveFixtures) {
  const result = resultsByPath.get(path.join(fixtureRoot, fileName));
  if (result === undefined) {
    failures.push(`${fileName} was not linted`);
  } else if (result.messages.length > 0) {
    failures.push(`${fileName} must be clean (${formatMessages(result.messages)})`);
  }
}

for (const fileName of negativeFixtures) {
  const result = resultsByPath.get(path.join(fixtureRoot, fileName));
  if (result === undefined) {
    failures.push(`${fileName} was not linted`);
    continue;
  }

  const boundaryErrors = result.messages.filter(
    (message) => message.severity === 2 && message.ruleId === boundaryRule
  );
  const unexpectedMessages = result.messages.filter(
    (message) => message.severity !== 2 || message.ruleId !== boundaryRule
  );

  if (boundaryErrors.length === 0) {
    failures.push(`${fileName} must fail ${boundaryRule}`);
  }
  if (unexpectedMessages.length > 0) {
    failures.push(
      `${fileName} has unexpected lint findings (${formatMessages(unexpectedMessages)})`
    );
  }
}

if (failures.length > 0) {
  console.error("eslint-fixtures lint verification failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `eslint-fixtures lint verified: ${positiveFixtures.length} positive fixtures are clean and ${negativeFixtures.length} negative fixtures fail ${boundaryRule}`
);
