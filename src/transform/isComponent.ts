import * as t from "@babel/types";
import traverse from "@babel/traverse";
import { isPropTypesDecl } from "./prop-types";

export default function isComponent(ast: t.Node, fileName: string): boolean {
  let result = false;
  traverse(ast, {
    ExpressionStatement: function (path) {
      if (isPropTypesDecl(path, fileName)) {
        result = true;
        path.stop();
      }
    },
  });
  return result;
}
