import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { makeJSXType } from "./prop-types";
import { TransformError } from "./TransformError";

export function isComponentDecl(
  path: NodePath,
  expectedName: string
): path is NodePath<t.FunctionDeclaration> {
  return !(
    !path.isFunctionDeclaration() ||
    !path.get("id").isIdentifier({ name: expectedName })
  );
}

export function getFuncName(path: NodePath<t.FunctionDeclaration>): string {
  const node = path.get("id").node;
  if (node == null) {
    throw new TransformError("Cannot get function name.");
  }
  return node.name;
}

export function augmentComponentSignature(
  path: NodePath<t.FunctionDeclaration>
): void {
  path.node.returnType = t.tsTypeAnnotation(makeJSXType("Element"));
  const params = path.get("params");
  if (params.length === 1) {
    const param = params[0];
    param.node.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier(`${getFuncName(path)}Props`))
    );
  }
}
