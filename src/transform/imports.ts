import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";

export interface Rule<TNode extends t.Node> {
  apply(path: NodePath<TNode>): boolean;
}

type SpecType = "default" | "value";
type Specifier =
  | t.ImportDefaultSpecifier
  | t.ImportSpecifier
  | t.ImportNamespaceSpecifier;

export class SymbolImport {
  name: string;
  type: SpecType;

  constructor(type: SpecType, name: string) {
    this.type = type;
    this.name = name;
  }

  match(path: NodePath<Specifier>): boolean {
    const type: SpecType = path.isImportDefaultSpecifier()
      ? "default"
      : "value";
    const name = path.node.local.name;
    return name === this.name && type === this.type;
  }

  make(): Specifier {
    switch (this.type) {
      case "value":
        return t.importSpecifier(
          t.identifier(this.name),
          t.identifier(this.name)
        );
      case "default":
        return t.importDefaultSpecifier(t.identifier(this.name));
    }
  }
}

export class SymbolRule implements Rule<Specifier> {
  readonly expected: SymbolImport;
  readonly replace: SymbolImport;

  constructor(expected: SymbolImport, replace: SymbolImport) {
    this.expected = expected;
    this.replace = replace;
  }

  apply(path: NodePath<Specifier>): boolean {
    if (!this.expected.match(path)) {
      return false;
    }
    path.replaceWith(this.replace.make());
    return true;
  }
}

export class SourceRule implements Rule<t.StringLiteral> {
  readonly match: RegExp;
  readonly replace: string;

  constructor(match: RegExp, replace: string) {
    this.match = match;
    this.replace = replace;
  }

  apply(path: NodePath<t.StringLiteral>): boolean {
    if (!path.node.value.match(this.match)) {
      return false;
    }
    path.node.value = path.node.value.replace(this.match, this.replace);
    return true;
  }
}

export class ImportRule implements Rule<t.ImportDeclaration> {
  readonly source: SourceRule;
  readonly symbols: SymbolRule[];

  constructor(source: SourceRule, symbols: SymbolRule[] = []) {
    this.source = source;
    this.symbols = symbols;
  }

  apply(path: NodePath<t.ImportDeclaration>): boolean {
    if (!this.source.apply(path.get("source"))) {
      return false;
    }
    for (const spec of path.get("specifiers")) {
      for (const rule of this.symbols) {
        if (rule.apply(spec)) {
          break;
        }
      }
    }
    return true;
  }
}

export class RemoveImportRule implements Rule<t.ImportDeclaration> {
  readonly source: RegExp;

  constructor(source: RegExp) {
    this.source = source;
  }

  apply(path: NodePath<t.ImportDeclaration>): boolean {
    if (!path.node.source.value.match(this.source)) {
      return false;
    }
    path.remove();
    return true;
  }
}

export function applyRules<TNode extends t.Node>(
  path: NodePath<TNode>,
  rules: readonly Rule<TNode>[]
): boolean {
  for (const rule of rules) {
    if (rule.apply(path)) {
      return true;
    }
  }
  return false;
}

export type SpecDescr = string | { default: string };

function makeImport(descr: SpecDescr): SymbolImport {
  if (typeof descr === "string") {
    return new SymbolImport("value", descr);
  } else {
    return new SymbolImport("default", descr.default);
  }
}

export function replace(expected: SpecDescr, subst: SpecDescr): SymbolRule {
  return new SymbolRule(makeImport(expected), makeImport(subst));
}

export function rule(
  src: RegExp,
  newSrc: string,
  subst: SymbolRule | SymbolRule[]
): ImportRule {
  if (subst instanceof SymbolRule) {
    return new ImportRule(new SourceRule(src, newSrc), [subst]);
  }
  return new ImportRule(new SourceRule(src, newSrc), subst);
}

export function remove(source: RegExp): RemoveImportRule {
  return new RemoveImportRule(source);
}
