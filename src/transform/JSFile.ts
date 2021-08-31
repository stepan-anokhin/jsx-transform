import * as t from "@babel/types";
import { existsSync, readFileSync } from "fs";
import { parse } from "@babel/parser";
import isComponent from "./isComponent";
import { getFileName } from "../util/path";
import transformComponent from "./transformComponent";
import { Rule } from "./imports";
import generate from "@babel/generator";

export default class JSFile {
  readonly path: string;
  private _ast?: t.Node;

  constructor(path: string) {
    this.path = path;
  }

  exists(): boolean {
    return existsSync(this.path);
  }

  isComponent(): boolean {
    return isComponent(this.ast, this.name);
  }

  transform(
    importRules: readonly Rule<t.ImportDeclaration>[],
    mappings?: ReadonlyMap<string, string>
  ): void {
    transformComponent(this.ast, this.name, importRules, mappings);
  }

  get ast(): t.Node {
    if (this._ast == null) {
      const code = readFileSync(this.path, { encoding: "utf-8" });
      this._ast = parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });
    }
    return this._ast;
  }

  get name(): string {
    return getFileName(this.path);
  }
}
