import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import { TransformError } from "./TransformError";

export type TSPropTypes = {
  node: t.TSType;
  optional: boolean;
};

function isRequired(path: NodePath<t.Expression>): boolean {
  return (
    path.isMemberExpression() &&
    path.get("property").isIdentifier({ name: "isRequired" })
  );
}

function chopIsRequired(path: NodePath<t.Expression>): NodePath<t.Expression> {
  if (isRequired(path)) {
    return path.get("object") as NodePath<t.Expression>;
  }
  return path;
}

function isCustomTypeReference(
  path: NodePath<t.Expression>
): path is NodePath<t.Identifier> {
  return path.isIdentifier();
}

function convertCustomTypeReference(
  path: NodePath<t.Identifier>,
  mapping: Map<string, string>
): t.TSType {
  const name = mapping.get(path.node.name) || path.node.name;
  return t.tsTypeReference(t.identifier(name));
}

function isPrimitive(
  path: NodePath<t.Expression>
): path is NodePath<t.MemberExpression> {
  if (
    !path.isMemberExpression() ||
    !path.get("object").isIdentifier({ name: "PropTypes" })
  ) {
    return false;
  }
  const value = path.get("property");
  return (value as NodePath).isIdentifier();
}

function makeCallbackType(): t.TSType {
  const varargs = t.restElement(t.identifier("args"));
  varargs.typeAnnotation = t.tsTypeAnnotation(t.tsArrayType(t.tsAnyKeyword()));
  return t.tsFunctionType(
    null,
    [varargs],
    t.tsTypeAnnotation(t.tsVoidKeyword())
  );
}

export function makeJSXType(name: string): t.TSType {
  return t.tsTypeReference(
    t.tsQualifiedName(t.identifier("JSX"), t.identifier(name))
  );
}

function makeRenderableType(): t.TSType {
  return t.tsUnionType([
    t.tSStringKeyword(),
    t.tsNumberKeyword(),
    t.tsBooleanKeyword(),
    makeJSXType("Element"),
  ]);
}

function convertPrimitive(path: NodePath<t.MemberExpression>): t.TSType {
  const typeName = (path.get("property") as NodePath<t.Identifier>).node.name;
  switch (typeName) {
    case "string":
      return t.tSStringKeyword();
    case "number":
      return t.tsNumberKeyword();
    case "bool":
      return t.tsBooleanKeyword();
    case "func":
      return makeCallbackType();
    case "element":
      return makeJSXType("Element");
    case "elementType":
      return makeJSXType("ElementClass");
    case "node":
      return t.tsUnionType([
        makeRenderableType(),
        t.tsArrayType(makeRenderableType()),
      ]);
    default:
      throw new TransformError(
        "Unable to convert primitive type.",
        path.node.loc?.start
      );
  }
}

function isComplexType(
  path: NodePath<t.Expression>,
  name: string
): path is NodePath<t.CallExpression> {
  if (!path.isCallExpression()) {
    return false;
  }

  const callee = path.get("callee");
  if (
    !callee.isMemberExpression() ||
    !callee.get("object").isIdentifier({ name: "PropTypes" })
  ) {
    return false;
  }

  const attr = callee.get("property");
  return (attr as NodePath).isIdentifier({ name });
}

function getArg(path: NodePath<t.CallExpression>): NodePath<t.Expression> {
  const arg = path.get("arguments")[0];
  if (arg?.isExpression()) {
    return arg;
  }
  throw new TransformError(
    "Unexpected PropTypes complex type argument.",
    arg?.node.loc?.start
  );
}

export function convertPropType(
  pathArg: NodePath<t.Expression>,
  mapping: Map<string, string>
): TSPropTypes {
  const optional = !isRequired(pathArg);
  const path = chopIsRequired(pathArg);

  // Handle custom prop-type reference
  if (isCustomTypeReference(path)) {
    const node = convertCustomTypeReference(path, mapping);
    return { node, optional };
  }

  // Handle primitive types
  if (isPrimitive(path)) {
    const node = convertPrimitive(path);
    return { node, optional };
  }

  if (isComplexType(path, "shape")) {
    const body = getArg(path);
    if (!body.isObjectExpression()) {
      throw new TransformError(
        "Invalid shape expression.",
        body.node.loc?.start
      );
    }
    const node = convertShape(body, mapping);
    return { node, optional };
  }

  if (isComplexType(path, "oneOfType")) {
    const body = getArg(path);
    if (!body.isArrayExpression()) {
      throw new TransformError(
        "Invalid array expression.",
        body.node.loc?.start
      );
    }
    const node = convertUnion(body, mapping);
    return { node, optional };
  }

  throw new TransformError("Cannot convert prop-type.", path.node.loc?.start);
}

export function convertShape(
  path: NodePath<t.ObjectExpression>,
  mapping: Map<string, string>
): t.TSTypeLiteral {
  const members: t.TSTypeElement[] = [];
  for (let property of path.get("properties")) {
    if (property.isObjectProperty()) {
      members.push(convertProperty(property, mapping));
    }
  }
  return t.tsTypeLiteral(members);
}

function convertProperty(
  path: NodePath<t.ObjectProperty>,
  mapping: Map<string, string>
): t.TSTypeElement {
  const value = path.get("value");
  if (!value.isExpression()) {
    throw new TransformError("Unexpected type value.", path.node.loc?.start);
  }

  const name = t.identifier((path.node.key as t.Identifier).name);
  const tsType = convertPropType(value, mapping);
  const typeAnnotation = t.tsTypeAnnotation(tsType.node);
  const signature = t.tsPropertySignature(name, typeAnnotation);
  signature.optional = tsType.optional;
  signature.leadingComments = path.node.leadingComments;
  return signature;
}

function convertUnion(
  path: NodePath<t.ArrayExpression>,
  mapping: Map<string, string>
): t.TSType {
  const types: t.TSType[] = [];
  let optional = false;
  for (let element of path.get("elements")) {
    if (element.isExpression()) {
      const tsElement = convertPropType(element, mapping);
      optional &&= tsElement.optional;
      types.push(tsElement.node);
    }
  }
  if (optional) {
    types.push(t.tsUndefinedKeyword());
  }
  return t.tsUnionType(types);
}

export function isPropTypesDecl(
  path: NodePath,
  expectedComponentName?: string
): path is NodePath<t.ExpressionStatement> {
  if (!path.parentPath?.isProgram()) {
    return false;
  }

  if (!path.isExpressionStatement()) {
    return false;
  }

  const expr = path.get("expression");
  if (!expr?.isAssignmentExpression()) {
    return false;
  }

  const target = expr.get("left") as NodePath;
  if (!target?.isMemberExpression()) {
    return false;
  }

  if (!target.get("object").isIdentifier()) {
    return false;
  }

  if (
    expectedComponentName &&
    !target.get("object").isIdentifier({ name: expectedComponentName })
  ) {
    return false;
  }

  if (!target.get("property").isIdentifier({ name: "propTypes" })) {
    return false;
  }

  return expr.get("right")?.isObjectExpression();
}

export function getComponentName(path: NodePath): string | undefined {
  if (!path.isExpressionStatement()) {
    return undefined;
  }

  const expr = path.get("expression");
  if (!expr?.isAssignmentExpression()) {
    return undefined;
  }

  const target = expr.get("left") as NodePath;
  if (!target?.isMemberExpression()) {
    return undefined;
  }

  const object = target.get("object");
  if (!object.isIdentifier()) {
    return undefined;
  }

  return object.node.name;
}

export function getPropTypeExpr(path: NodePath): NodePath<t.ObjectExpression> {
  if (!isPropTypesDecl(path)) {
    throw new TransformError(
      "Cannot get PropTypes expression: not a declaration",
      path.node.loc?.start
    );
  }

  const expr = path.get("expression") as NodePath<t.AssignmentExpression>;
  return expr.get("right") as NodePath<t.ObjectExpression>;
}

export function isTSPropTypesDecl(
  path: NodePath,
  componentName: string
): path is NodePath<t.ExportNamedDeclaration> {
  if (!path.isExportNamedDeclaration({ exportKind: "type" })) {
    return false;
  }

  const decl = path.get("declaration");
  if (!decl.isTSTypeAliasDeclaration()) {
    return false;
  }

  return decl.get("id").isIdentifier({ name: `${componentName}Props` });
}

export function makeTSPropTypeDeclaration(
  path: NodePath,
  mapping: Map<string, string>
): t.ExportNamedDeclaration {
  if (!isPropTypesDecl(path)) {
    throw new TransformError(
      "Cannot create TypeScript prop type from not a prop-type declaration.",
      path.node.loc?.start
    );
  }

  const compName = getComponentName(path);
  const typeExpr = getPropTypeExpr(path);
  return t.exportNamedDeclaration(
    t.tsTypeAliasDeclaration(
      t.identifier(`${compName}Props`),
      null,
      convertShape(typeExpr, mapping)
    )
  );
}
