import { importRules } from "./rules";
import Converter, { ignore, printResults } from "../transform/Converter";

// const filePath = process.argv[2];
// const compName = getFileName(filePath);
//
// const code = readFileSync(filePath, { encoding: "utf-8" });
// const ast = parse(code, {
//   sourceType: "module",
//   plugins: ["jsx", "typescript"],
// });
//
// transformComponent(ast, compName, importRules);
//
// console.log(generate(ast, {}).code);

const paths = process.argv.slice(2);
const converter = new Converter(importRules);
const results = converter.convert(paths, ignore);
printResults(results);
