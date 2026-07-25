import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const PROJECT_ROOTS = ["apps", "packages", "plugins", "resources", "scripts", "services", "tools"];
const EXCLUDED_DIRECTORY_NAMES = new Set([
  "__fixtures__",
  "__generated__",
  "__tests__",
  "build",
  "coverage",
  "dist",
  "fixtures",
  "generated",
  "node_modules",
  "proof",
  "test",
  "tests",
]);
const EXCLUDED_SOURCE_SUFFIX = /\.(?:d|gen|generated|spec|test|typecheck)\.[cm]?[jt]sx?$/u;
const PLACEHOLDER_DOCUMENTATION = /^(?:todo|tbd|fixme|placeholder|documentation\s+pending)\b/iu;

/**
 * @typedef {{
 *   file: string,
 *   line: number,
 *   column: number,
 *   code: "MISSING_IMPORTED_EXPORT_JSDOC" | "MISSING_IMPORTED_EXPORT_PARAM_JSDOC",
 *   symbol: string,
 *   parameter?: string,
 *   consumer: string
 * }} ImportedExportJSDocViolation
 */

/**
 * @typedef {{
 *   configPath: string,
 *   program: import("typescript").Program,
 *   consumerFiles: ReadonlySet<string>,
 *   admittedFiles: ReadonlySet<string>
 * }} ImportedExportJSDocProject
 */

/**
 * @typedef {{
 *   configPath: string,
 *   rootNames: string[],
 *   options: import("typescript").CompilerOptions,
 *   projectReferences: readonly import("typescript").ProjectReference[] | undefined,
 *   consumerFiles: ReadonlySet<string>
 * }} ImportedExportJSDocProjectConfig
 */

/** @param {string} value */
function normalizePath(value) {
  return path.resolve(value).replaceAll(path.sep, "/");
}

/** @param {string} repositoryRoot @param {string} fileName */
function repositoryRelativePath(repositoryRoot, fileName) {
  return path.relative(repositoryRoot, fileName).replaceAll(path.sep, "/");
}

/** @param {string} repositoryRoot @param {string} fileName */
function isInsideRepository(repositoryRoot, fileName) {
  const relative = path.relative(repositoryRoot, fileName);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

/** @param {string} repositoryRoot @param {string} fileName */
function hasExcludedDirectory(repositoryRoot, fileName) {
  return repositoryRelativePath(repositoryRoot, fileName)
    .split("/")
    .some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));
}

/** @param {string} repositoryRoot @param {string} configPath */
function isAdmittedProjectConfig(repositoryRoot, configPath) {
  if (
    !isInsideRepository(repositoryRoot, configPath) ||
    hasExcludedDirectory(repositoryRoot, configPath)
  ) {
    return false;
  }
  const segments = repositoryRelativePath(repositoryRoot, configPath).split("/");
  return PROJECT_ROOTS.includes(segments[0] ?? "") && segments.at(-1) === "tsconfig.json";
}

/** @param {string} repositoryRoot @param {string} fileName */
function isAuthoredProductionSource(repositoryRoot, fileName) {
  if (!isInsideRepository(repositoryRoot, fileName)) {
    return false;
  }

  const relative = repositoryRelativePath(repositoryRoot, fileName);
  const segments = relative.split("/");
  if (!PROJECT_ROOTS.includes(segments[0] ?? "")) {
    return false;
  }
  if (segments.some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment))) {
    return false;
  }
  return /\.[cm]?[jt]sx?$/u.test(relative) && !EXCLUDED_SOURCE_SUFFIX.test(relative);
}

/**
 * @param {string} repositoryRoot
 * @param {string} fileName
 * @param {ReadonlySet<string> | undefined} admittedFiles
 */
function isAdmittedProductionSource(repositoryRoot, fileName, admittedFiles) {
  return (
    isAuthoredProductionSource(repositoryRoot, fileName) &&
    (admittedFiles === undefined || admittedFiles.has(normalizePath(fileName)))
  );
}

/** @param {import("typescript").Diagnostic} diagnostic */
function formatConfigDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

/** @param {string} repositoryRoot */
function discoverProjectConfigs(repositoryRoot) {
  return PROJECT_ROOTS.flatMap((projectRoot) =>
    ts.sys.readDirectory(
      path.join(repositoryRoot, projectRoot),
      [".json"],
      ["node_modules"],
      ["**/tsconfig.json"]
    )
  )
    .map(normalizePath)
    .filter((configPath) => isAdmittedProjectConfig(repositoryRoot, configPath))
    .sort();
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Symbol} symbol
 */
function resolveAlias(checker, symbol) {
  const seen = /** @type {Set<import("typescript").Symbol>} */ (new Set());
  let current = symbol;
  while ((current.flags & ts.SymbolFlags.Alias) !== 0 && !seen.has(current)) {
    seen.add(current);
    current = checker.getAliasedSymbol(current);
  }
  return current;
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").SourceFile} sourceFile
 * @param {Map<import("typescript").SourceFile, Set<import("typescript").Symbol>>} cache
 */
function exportedSymbolsForFile(checker, sourceFile, cache) {
  const cached = cache.get(sourceFile);
  if (cached !== undefined) {
    return cached;
  }

  const result = /** @type {Set<import("typescript").Symbol>} */ (new Set());
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol !== undefined) {
    for (const exportedSymbol of checker.getExportsOfModule(moduleSymbol)) {
      result.add(exportedSymbol);
      result.add(resolveAlias(checker, exportedSymbol));
    }
  }
  cache.set(sourceFile, result);
  return result;
}

/**
 * @param {string} repositoryRoot
 * @param {import("typescript").Node} node
 */
function sourceLocation(repositoryRoot, node) {
  const sourceFile = node.getSourceFile();
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return {
    file: repositoryRelativePath(repositoryRoot, sourceFile.fileName),
    line: position.line + 1,
    column: position.character + 1,
  };
}

/**
 * @param {import("typescript").Symbol} symbol
 * @param {import("typescript").TypeChecker} checker
 */
function documentationText(symbol, checker) {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
}

/** @param {string} value */
function isUsefulDocumentation(value) {
  const normalized = value.trim().replace(/^[-:]\s*/u, "");
  return normalized.length > 0 && !PLACEHOLDER_DOCUMENTATION.test(normalized);
}

/**
 * @param {string} repositoryRoot
 * @param {import("typescript").Symbol} symbol
 * @param {ReadonlySet<string>} [admittedFiles]
 */
function ownerDeclaration(repositoryRoot, symbol, admittedFiles) {
  const candidates = [
    ...(symbol.valueDeclaration === undefined ? [] : [symbol.valueDeclaration]),
    ...(symbol.declarations ?? []),
  ];
  return candidates.find((declaration) =>
    isAdmittedProductionSource(repositoryRoot, declaration.getSourceFile().fileName, admittedFiles)
  );
}

/**
 * @param {import("typescript").Symbol} symbol
 * @param {import("typescript").Node} owner
 */
function diagnosticSymbolName(symbol, owner) {
  if (
    symbol.getName() !== "default" ||
    (!ts.isFunctionDeclaration(owner) && !ts.isClassDeclaration(owner))
  ) {
    return symbol.getName();
  }
  return owner.name?.text ?? symbol.getName();
}

/**
 * @param {import("typescript").Program} program
 * @param {string} repositoryRoot
 * @param {ReadonlySet<string>} [consumerFiles]
 * @param {ReadonlySet<string>} [admittedFiles]
 */
function collectConsumedSymbols(program, repositoryRoot, consumerFiles, admittedFiles) {
  const checker = program.getTypeChecker();
  const exportsByFile =
    /** @type {Map<import("typescript").SourceFile, Set<import("typescript").Symbol>>} */ (
      new Map()
    );
  const consumersBySymbol = /** @type {Map<import("typescript").Symbol, string>} */ (new Map());

  for (const consumer of program.getSourceFiles()) {
    if (
      !isAuthoredProductionSource(repositoryRoot, consumer.fileName) ||
      (consumerFiles !== undefined && !consumerFiles.has(normalizePath(consumer.fileName)))
    ) {
      continue;
    }

    /** @param {import("typescript").Node} node */
    function visit(node) {
      if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
        const observed = checker.getSymbolAtLocation(node);
        if (observed !== undefined) {
          const symbol = resolveAlias(checker, observed);
          const declarations = symbol.declarations ?? [];
          const crossesFile = declarations.some((declaration) => {
            const owner = declaration.getSourceFile();
            return (
              owner !== consumer &&
              isAdmittedProductionSource(repositoryRoot, owner.fileName, admittedFiles) &&
              exportedSymbolsForFile(checker, owner, exportsByFile).has(symbol)
            );
          });
          if (crossesFile) {
            const consumerPath = repositoryRelativePath(repositoryRoot, consumer.fileName);
            const existing = consumersBySymbol.get(symbol);
            if (existing === undefined || consumerPath.localeCompare(existing) < 0) {
              consumersBySymbol.set(symbol, consumerPath);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(consumer, visit);
  }

  return consumersBySymbol;
}

/** @param {import("typescript").Symbol} parameter */
function parameterHasUsefulTag(parameter) {
  const declaration = parameter.valueDeclaration;
  if (declaration === undefined || !ts.isParameter(declaration)) {
    return false;
  }
  return ts
    .getJSDocParameterTags(declaration)
    .some((tag) => isUsefulDocumentation(ts.getTextOfJSDocComment(tag.comment) ?? ""));
}

/**
 * @param {{
 *   checker: import("typescript").TypeChecker,
 *   repositoryRoot: string,
 *   symbol: import("typescript").Symbol,
 *   symbolName: string,
 *   owner: import("typescript").Node,
 *   consumer: string
 * }} input
 * @returns {ImportedExportJSDocViolation[]}
 */
function findParameterViolations({ checker, repositoryRoot, symbol, symbolName, owner, consumer }) {
  if ((symbol.flags & ts.SymbolFlags.Value) === 0) {
    return [];
  }

  const type = checker.getTypeOfSymbolAtLocation(symbol, owner);
  const violations = /** @type {ImportedExportJSDocViolation[]} */ ([]);
  const seen = new Set();
  for (const signature of type.getCallSignatures()) {
    if (signature.parameters.length <= 3) {
      continue;
    }
    for (const parameter of signature.parameters) {
      if (parameterHasUsefulTag(parameter)) {
        continue;
      }
      const declaration = parameter.valueDeclaration ?? owner;
      const location = sourceLocation(repositoryRoot, declaration);
      const key = `${location.file}:${location.line}:${location.column}:${parameter.name}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      violations.push({
        code: "MISSING_IMPORTED_EXPORT_PARAM_JSDOC",
        ...location,
        symbol: symbolName,
        parameter: parameter.getName(),
        consumer,
      });
    }
  }
  return violations;
}

/** @param {ImportedExportJSDocViolation} violation */
function violationIdentity(violation) {
  return [
    violation.file,
    violation.line,
    violation.column,
    violation.code,
    violation.symbol,
    typeof violation.parameter === "string" ? violation.parameter : "",
  ].join(":");
}

/**
 * @param {ImportedExportJSDocViolation} left
 * @param {ImportedExportJSDocViolation} right
 */
function compareViolations(left, right) {
  return `${violationIdentity(left)}:${left.consumer}`.localeCompare(
    `${violationIdentity(right)}:${right.consumer}`
  );
}

/** @param {string} repositoryRoot */
function readProjectConfigurations(repositoryRoot) {
  const configPaths = discoverProjectConfigs(repositoryRoot);
  const configErrors = /** @type {string[]} */ ([]);
  const configurations = /** @type {ImportedExportJSDocProjectConfig[]} */ ([]);

  if (configPaths.length === 0) {
    throw new Error("TYPESCRIPT_SOURCE_CONFIG_INVALID\nno project tsconfig.json files found");
  }

  for (const configPath of configPaths) {
    const parsed = ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic(diagnostic) {
          configErrors.push(`${configPath}: ${formatConfigDiagnostic(diagnostic)}`);
        },
      }
    );
    if (parsed === undefined) {
      continue;
    }
    for (const diagnostic of parsed.errors) {
      configErrors.push(`${configPath}: ${formatConfigDiagnostic(diagnostic)}`);
    }
    const consumerFiles = new Set(
      parsed.fileNames
        .filter((fileName) => isAuthoredProductionSource(repositoryRoot, fileName))
        .map(normalizePath)
    );
    if (consumerFiles.size === 0) {
      continue;
    }
    configurations.push({
      configPath,
      rootNames: parsed.fileNames,
      options: parsed.options,
      projectReferences: parsed.projectReferences,
      consumerFiles,
    });
  }

  if (configErrors.length > 0) {
    throw new Error(
      `TYPESCRIPT_SOURCE_CONFIG_INVALID\n${[...new Set(configErrors)].sort().join("\n")}`
    );
  }
  if (configurations.length === 0) {
    throw new Error("TYPESCRIPT_SOURCE_CONFIG_INVALID\nno authored production source found");
  }
  return configurations;
}

/**
 * Yields one exact TypeScript program for each admitted production project.
 *
 * Every program uses that project's parsed `fileNames`, compiler options, and
 * project references. TypeScript therefore resolves each import under the
 * owning project's exact aliases and module rules instead of a synthetic
 * repository-wide configuration. Programs are yielded lazily so a repository
 * scan never retains every project's compiler graph at once. Configurations
 * under proof, fixture, generated, or build directories never enter the
 * production relation.
 *
 * @param {string} repositoryRoot Absolute repository root to inspect.
 * @returns {Generator<ImportedExportJSDocProject>} Project programs paired
 * with their owning configuration and production consumer files.
 */
export function* createImportedExportJSDocPrograms(repositoryRoot = REPOSITORY_ROOT) {
  const normalizedRoot = path.resolve(repositoryRoot);
  const configurations = readProjectConfigurations(normalizedRoot);
  const admittedFiles = new Set(
    configurations.flatMap((configuration) => [...configuration.consumerFiles])
  );
  for (const configuration of configurations) {
    yield {
      configPath: configuration.configPath,
      program: ts.createProgram({
        rootNames: configuration.rootNames,
        options: configuration.options,
        projectReferences: configuration.projectReferences,
      }),
      consumerFiles: configuration.consumerFiles,
      admittedFiles,
    };
  }
}

/**
 * Finds documentation gaps for symbols consumed across production source files.
 *
 * TypeChecker alias and export resolution follows named imports, default
 * imports, static re-exports, and statically named namespace members back to
 * their owning declaration. The wide-function rule applies only to exported
 * runtime values with callable signatures; callable type aliases remain type
 * documentation boundaries but do not require runtime `@param` tags.
 *
 * @param {import("typescript").Program} program One owning project's exact program.
 * @param {string} repositoryRoot Absolute root used to qualify authored source.
 * @param {ReadonlySet<string>} [consumerFiles] Exact production files owned by
 * the project configuration. Imported owner sources remain resolvable but are
 * not analyzed a second time as consumers.
 * @param {ReadonlySet<string>} [admittedFiles] Production files admitted by an
 * owning project configuration. Unowned scripts cannot become inferred owners.
 * @returns {ReadonlyArray<ImportedExportJSDocViolation>} Stable documentation diagnostics.
 */
export function findImportedExportJSDocViolations(
  program,
  repositoryRoot = REPOSITORY_ROOT,
  consumerFiles,
  admittedFiles
) {
  const normalizedRoot = path.resolve(repositoryRoot);
  const checker = program.getTypeChecker();
  const consumed = collectConsumedSymbols(program, normalizedRoot, consumerFiles, admittedFiles);
  const violations = /** @type {ImportedExportJSDocViolation[]} */ ([]);

  for (const [symbol, consumer] of consumed) {
    const owner = ownerDeclaration(normalizedRoot, symbol, admittedFiles);
    if (owner === undefined) {
      continue;
    }
    const symbolName = diagnosticSymbolName(symbol, owner);
    if (!isUsefulDocumentation(documentationText(symbol, checker))) {
      violations.push({
        code: "MISSING_IMPORTED_EXPORT_JSDOC",
        ...sourceLocation(normalizedRoot, owner),
        symbol: symbolName,
        consumer,
      });
    }
    violations.push(
      ...findParameterViolations({
        checker,
        repositoryRoot: normalizedRoot,
        symbol,
        symbolName,
        owner,
        consumer,
      })
    );
  }

  return violations.sort(compareViolations);
}

/**
 * Merges project-local findings into one repository-stable diagnostic set.
 *
 * The same owner may appear in multiple project programs. Its declaration is
 * reported once, and the lexicographically first production consumer supplies
 * the diagnostic context so project discovery order cannot change output.
 *
 * @param {Iterable<ImportedExportJSDocProject>} projects
 * Exact project programs to inspect.
 * @param {string} repositoryRoot Absolute root used to qualify authored source.
 * @returns {ReadonlyArray<ImportedExportJSDocViolation>} Deduplicated stable diagnostics.
 */
export function findRepositoryImportedExportJSDocViolations(
  projects,
  repositoryRoot = REPOSITORY_ROOT
) {
  const byIdentity = /** @type {Map<string, ImportedExportJSDocViolation>} */ (new Map());
  for (const { program, consumerFiles, admittedFiles } of projects) {
    for (const violation of findImportedExportJSDocViolations(
      program,
      repositoryRoot,
      consumerFiles,
      admittedFiles
    )) {
      const identity = violationIdentity(violation);
      const existing = byIdentity.get(identity);
      if (
        existing === undefined ||
        String(violation.consumer).localeCompare(String(existing.consumer)) < 0
      ) {
        byIdentity.set(identity, violation);
      }
    }
  }
  return [...byIdentity.values()].sort(compareViolations);
}

/**
 * Enforces the repository's cross-file TypeScript documentation boundary.
 *
 * The assertion composes TypeScript-owned import identity with declaration
 * JSDoc and exact parameter tags. It adds no export registry or second source
 * graph; callers either receive one stable violation list or a successful
 * admission.
 *
 * @param {object} options Assertion inputs.
 * @param {string} [options.repositoryRoot] Repository root to inspect.
 * @param {Iterable<ImportedExportJSDocProject>} [options.projects]
 * Injected project programs for tests.
 */
export function assertImportedExportJSDoc({
  repositoryRoot = REPOSITORY_ROOT,
  projects = createImportedExportJSDocPrograms(repositoryRoot),
} = {}) {
  const violations = findRepositoryImportedExportJSDocViolations(projects, repositoryRoot);
  if (violations.length === 0) {
    return;
  }

  const rendered = violations.map((violation) => {
    const parameter =
      typeof violation.parameter === "string" ? ` parameter=${violation.parameter}` : "";
    return `${violation.file}:${violation.line}:${violation.column} ${violation.code} symbol=${violation.symbol}${parameter} consumer=${violation.consumer}`;
  });
  throw new Error(
    `IMPORTED_EXPORT_JSDOC_FAILED\n${rendered.join("\n")}\n` +
      "Document the consumed declaration's purpose, ownership, behavior, and flow; document every parameter when a value-callable signature has more than three."
  );
}

if (import.meta.main) {
  try {
    assertImportedExportJSDoc();
    console.log(
      "imported export JSDoc: every production cross-file symbol has declaration documentation and every consumed value-callable signature over three parameters documents each parameter"
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
