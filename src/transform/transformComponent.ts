import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { isPropTypesDecl, makeTSPropTypeDeclaration } from "./prop-types";
import { augmentComponentSignature, isComponentDecl } from "./signature";
import { applyRules, Rule } from "./imports";
import { makeTypeMapping } from "../commands/rules";

export default function transformComponent(
  ast: t.Node,
  expectedComponentName: string,
  importRules: readonly Rule<t.ImportDeclaration>[],
  typeMappings?: ReadonlyMap<string, string> | null | undefined
) {
  const mappings: ReadonlyMap<string, string> =
    typeMappings || makeTypeMapping(importRules);
  traverse(ast, {
    ExpressionStatement: function (path) {
      if (isPropTypesDecl(path, expectedComponentName)) {
        const tsPropType = makeTSPropTypeDeclaration(path, mappings);
        path.replaceWith(tsPropType);
      }
    },
    FunctionDeclaration: function (path) {
      if (isComponentDecl(path, expectedComponentName)) {
        augmentComponentSignature(path);
      }
    },
    ImportDeclaration: function (path) {
      applyRules(path, importRules);
    },
  });
}
