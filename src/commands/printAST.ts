import { readFileSync } from "fs";
import { parse } from "@babel/parser";
import jsonpath from "jsonpath";
import omitDeep from "omit-deep-lodash";

const filePath = process.argv[2];
const query = process.argv[3] || "$";

const code = readFileSync(filePath, { encoding: "utf-8" });
const ast = parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

const selected = jsonpath
  .query(ast, query)
  .map((item) => omitDeep(item, ["loc", "start", "end"]));
console.log(JSON.stringify(selected, null, 2));
