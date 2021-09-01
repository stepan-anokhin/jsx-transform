import * as t from "@babel/types";
import { Rule } from "./imports";
import { makeTypeMapping } from "../commands/rules";
import JSFile from "./JSFile";
import generate from "@babel/generator";
import colors from "colors";
import { isTransformError } from "./TransformError";
import { extname } from "path";
import { rmSync, writeFileSync } from "fs";

export type Failure = {
  path: string;
  error: Error;
};

export type ConverterResults = {
  skipped: string[];
  notFound: string[];
  success: string[];
  failed: Failure[];
};

export type Handler = (path: string, code: string) => void;

export default class Converter {
  readonly rules: readonly Rule<t.ImportDeclaration>[];
  readonly mappings: ReadonlyMap<string, string>;

  constructor(
    rules: readonly Rule<t.ImportDeclaration>[],
    mappings?: ReadonlyMap<string, string>
  ) {
    this.rules = rules;
    if (mappings == null) {
      this.mappings = makeTypeMapping(this.rules);
    } else {
      this.mappings = mappings;
    }
  }

  convert(paths: readonly string[], handler: Handler): ConverterResults {
    const results: ConverterResults = {
      skipped: [],
      notFound: [],
      success: [],
      failed: [],
    };

    paths = [...paths].sort();
    for (const path of paths) {
      const file = new JSFile(path);
      if (!file.exists()) {
        results.notFound.push(path);
        continue;
      }

      if (!file.isComponent()) {
        results.skipped.push(path);
        continue;
      }

      try {
        file.transform(this.rules, this.mappings);
        const code = generate(file.ast, {}).code;
        handler(path, code);
        results.success.push(path);
      } catch (error) {
        if (error instanceof Error) {
          results.failed.push({ path, error });
        } else {
          results.failed.push({ path, error: new Error(`${error}`) });
        }
      }
    }

    return results;
  }
}

export function printResults(results: ConverterResults) {
  for (const path of results.success) {
    console.log(colors.bold.green("OK"), path);
  }
  for (const path of results.skipped) {
    console.log(colors.bold.yellow("SKIPPED"), path);
  }
  for (const path of results.notFound) {
    console.log(colors.bold.yellow("MISSING"), path);
  }
  for (const failure of results.failed) {
    const error = failure.error;
    if (isTransformError(error)) {
      console.log(
        colors.bold.red("FAILURE"),
        `${failure.path}:${error.loc?.line}:${error.loc?.column} ${error.message}`
      );
    } else {
      console.log(
        colors.bold.red("FAILURE"),
        `${failure.path}: ${error.message}`
      );
    }
  }
}

export const ignore: Handler = () => {};

export const replace: Handler = (path: string, code: string) => {
  const ext = extname(path);
  const newPath = `${path.slice(0, -ext.length)}.tsx`;
  writeFileSync(newPath, code, { encoding: "utf-8" });
  rmSync(path);
};
