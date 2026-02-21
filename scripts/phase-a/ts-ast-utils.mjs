import ts from "typescript";

export function parseTypeScript(filePath, source) {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export function visit(node, fn) {
  fn(node);
  node.forEachChild((child) => visit(child, fn));
}

export function unwrapExpression(expression) {
  let current = expression;
  while (current) {
    if (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
  return undefined;
}

export function propertyNameText(nameNode) {
  if (!nameNode) return undefined;
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) return nameNode.text;
  return undefined;
}

export function asObjectLiteral(expression) {
  const unwrapped = unwrapExpression(expression);
  return unwrapped && ts.isObjectLiteralExpression(unwrapped) ? unwrapped : undefined;
}

export function getObjectProperty(objectLiteral, key) {
  return objectLiteral.properties.find((property) => {
    if (!ts.isPropertyAssignment(property)) return false;
    return propertyNameText(property.name) === key;
  });
}

export function getObjectPropertyInitializer(objectLiteral, key) {
  const property = getObjectProperty(objectLiteral, key);
  return property ? property.initializer : undefined;
}

export function findVariableObjectLiteral(sourceFile, variableName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName) continue;
      if (!declaration.initializer) continue;
      const objectLiteral = asObjectLiteral(declaration.initializer);
      if (objectLiteral) return objectLiteral;
    }
  }
  return undefined;
}

export function collectPropertyAccessSegments(expression) {
  const segments = [];
  let current = expression;

  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = current.expression;
  }

  if (ts.isIdentifier(current)) {
    segments.unshift(current.text);
    return segments;
  }

  return [];
}

export function matchesPropertyAccessChain(expression, segments) {
  const found = collectPropertyAccessSegments(expression);
  if (found.length !== segments.length) return false;
  return segments.every((segment, idx) => segment === found[idx]);
}

export function hasPropertyAccessChain(sourceFile, segments) {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isPropertyAccessExpression(node)) return;
    if (matchesPropertyAccessChain(node, segments)) {
      matched = true;
    }
  });
  return matched;
}

export function hasRouteRegistration(sourceFile, routeLiteral) {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node) || node.arguments.length === 0) return;
    const [firstArg] = node.arguments;
    if (!ts.isStringLiteral(firstArg) || firstArg.text !== routeLiteral) return;
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    const methodName = node.expression.name.text;
    if (methodName === "all" || methodName === "get" || methodName === "post") {
      matched = true;
    }
  });
  return matched;
}

export function hasIdentifierCall(sourceFile, identifierName) {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isCallExpression(node)) return;
    if (!ts.isIdentifier(node.expression)) return;
    if (node.expression.text === identifierName) {
      matched = true;
    }
  });
  return matched;
}

export function hasStringLiteral(sourceFile, predicate) {
  let matched = false;
  visit(sourceFile, (node) => {
    if (matched || !ts.isStringLiteral(node)) return;
    if (predicate(node.text)) {
      matched = true;
    }
  });
  return matched;
}

export function namedImportInfo(sourceFile, moduleName) {
  const result = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== moduleName) continue;
    const clause = statement.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    for (const element of clause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      result.set(imported, element.name.text);
    }
  }
  return result;
}

export function importModuleSet(sourceFile) {
  const modules = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    modules.add(statement.moduleSpecifier.text);
  }
  return modules;
}

export function hasImport(sourceFile, moduleName) {
  return importModuleSet(sourceFile).has(moduleName);
}

export function hasNamedImport(sourceFile, moduleName, importName) {
  return namedImportInfo(sourceFile, moduleName).has(importName);
}

export function findConstArrayLiteral(sourceFile, variableName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName) continue;
      if (!declaration.initializer) continue;
      const unwrapped = unwrapExpression(declaration.initializer);
      if (unwrapped && ts.isArrayLiteralExpression(unwrapped)) {
        return unwrapped;
      }
    }
  }
  return undefined;
}

export function stringArrayValues(arrayLiteral) {
  const values = [];
  for (const element of arrayLiteral.elements) {
    const unwrapped = unwrapExpression(element);
    if (unwrapped && ts.isStringLiteral(unwrapped)) {
      values.push(unwrapped.text);
    }
  }
  return values;
}
