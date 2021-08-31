import { readFileSync } from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { getFileName } from "./path";
import isPropTypesDecl from "./transform/prop-types";

const filePath = process.argv[2];
const compName = getFileName(filePath);

const code = readFileSync(filePath, { encoding: "utf-8" });
const ast = parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

// console.log(generate(ast, {}));

traverse(ast, {
  ExpressionStatement: function (path) {
    if (isPropTypesDecl(path, compName)) {
      console.log("Found!");
    }
  },
});
