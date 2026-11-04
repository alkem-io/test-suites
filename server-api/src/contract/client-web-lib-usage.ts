/**
 * What the client-web suite actually uses from `@alkemio/tests-lib`, read
 * from its source with the TypeScript parser — so the lib contract test
 * checks the surface the specs depend on today, not a list copied by hand
 * that drifts the moment a spec imports something new.
 *
 * Scope: `client-web/src` (the hand-written suites under the lib boundary;
 * `client-web/tests` is forge-verify's machine-written walks, outside it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const clientWebSrc = path.join(repoRoot, 'client-web/src');
const libRoot = path.join(repoRoot, 'lib');
const LIB_BARREL = '@alkemio/tests-lib';

export type ClientWebLibUsage = {
  /** Every name imported from the lib barrel (value or type). */
  importedNames: Set<string>;
  /** Every `Name.Member` reference on a name imported from the barrel. */
  memberReferences: Map<string, Set<string>>;
  /** Every generated-SDK operation called on `getGraphqlClient()`. */
  directSdkOperations: Set<string>;
  /** Files scanned — a guard against a scan that silently found nothing. */
  filesScanned: number;
};

const tsFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });

const add = <K, V>(map: Map<K, Set<V>>, key: K, value: V) => {
  const set = map.get(key) ?? new Set<V>();
  set.add(value);
  map.set(key, set);
};

const isGetGraphqlClientCall = (node: ts.Node): boolean =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'getGraphqlClient';

export function scanClientWebLibUsage(): ClientWebLibUsage {
  const importedNames = new Set<string>();
  const memberReferences = new Map<string, Set<string>>();
  const directSdkOperations = new Set<string>();
  const files = tsFiles(clientWebSrc);

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    // Local name → lib export name, for this file's barrel imports.
    const localToExport = new Map<string, string>();
    // Identifiers bound to the SDK: `const c = getGraphqlClient()` (call
    // `c.Op`) and `const c = () => getGraphqlClient()` (call `c().Op`).
    const sdkValues = new Set<string>();
    const sdkFactories = new Set<string>();

    for (const statement of source.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === LIB_BARREL
      ) {
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const exported = (element.propertyName ?? element.name).text;
            importedNames.add(exported);
            localToExport.set(element.name.text, exported);
          }
        }
      }
    }

    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        if (isGetGraphqlClientCall(node.initializer))
          sdkValues.add(node.name.text);
        if (
          ts.isArrowFunction(node.initializer) &&
          isGetGraphqlClientCall(node.initializer.body)
        ) {
          sdkFactories.add(node.name.text);
        }
      }
      if (ts.isPropertyAccessExpression(node)) {
        const target = node.expression;
        const member = node.name.text;
        if (ts.isIdentifier(target) && localToExport.has(target.text)) {
          add(memberReferences, localToExport.get(target.text)!, member);
        }
        const onSdk =
          isGetGraphqlClientCall(target) ||
          (ts.isIdentifier(target) && sdkValues.has(target.text)) ||
          (ts.isCallExpression(target) &&
            ts.isIdentifier(target.expression) &&
            sdkFactories.has(target.expression.text));
        if (onSdk) directSdkOperations.add(member);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return {
    importedNames,
    memberReferences,
    directSdkOperations,
    filesScanned: files.length,
  };
}

/** Every name the lib barrel exports — values and types — per the compiler. */
export function libBarrelExportNames(): Set<string> {
  const configPath = path.join(libRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, libRoot);
  const barrel = path.join(libRoot, 'src/index.ts');
  const program = ts.createProgram([barrel], {
    ...parsed.options,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(barrel);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) throw new Error(`could not read the exports of ${barrel}`);
  return new Set(
    checker.getExportsOfModule(moduleSymbol).map(symbol => symbol.name)
  );
}
