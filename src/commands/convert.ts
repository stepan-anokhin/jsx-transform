import { importRules } from "./rules";
import Converter, {
  ignore,
  printResults,
  replace,
} from "../transform/Converter";

const paths = process.argv.slice(2);
const converter = new Converter(importRules);
const results = converter.convert(paths, replace);
printResults(results);
