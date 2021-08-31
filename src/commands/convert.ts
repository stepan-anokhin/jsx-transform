import { getFileName } from "../util/path";
import { readFileSync } from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import {
  isPropTypesDecl,
  makeTSPropTypeDeclaration,
} from "../transform/prop-types";
import {
  augmentComponentSignature,
  isComponentDecl,
} from "../transform/signature";

const filePath = process.argv[2];
const compName = getFileName(filePath);

const code = readFileSync(filePath, { encoding: "utf-8" });
const ast = parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

const mapping = new Map<string, string>();
mapping.set("FileType", "File");

traverse(ast, {
  ExpressionStatement: function (path) {
    if (isPropTypesDecl(path, compName)) {
      const tsPropType = makeTSPropTypeDeclaration(path, mapping);
      path.replaceWith(tsPropType);
    }
  },
  FunctionDeclaration: function (path) {
    if (isComponentDecl(path, compName)) {
      augmentComponentSignature(path);
    }
  },
});

console.log(generate(ast, {}).code);
