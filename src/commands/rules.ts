import { ImportDeclaration } from "@babel/types";
import { ImportRule, remove, replace, Rule, rule } from "../transform/imports";

export const importRules: readonly Rule<ImportDeclaration>[] = [
  rule(/prop-types\/ActionType$/, "model/Action", [
    replace({ default: "ActionType" }, "Action"),
  ]),
  rule(/prop-types\/ContributorType$/, "model/Contributor", [
    replace({ default: "ContributorType" }, "Contributor"),
  ]),
  rule(/prop-types\/FileListType$/, "model/File", [
    replace({ default: "FileListType" }, "FileListType"),
  ]),
  rule(/prop-types\/FileMatchType$/, "model/FileMatch", [
    replace({ default: "FileMatchType" }, "FileMatch"),
  ]),
  rule(/prop-types\/FileSort$/, "model/File", [
    replace("FileSort", "FileSort"),
  ]),
  rule(/prop-types\/FileType$/, "model/File", [
    replace("FileType", "File"),
    replace({ default: "FileType" }, "File"),
  ]),
  rule(/prop-types\/MatchCategory$/, "model/MatchCategory", [
    replace("MatchCategory", "MatchCategory"),
  ]),
  rule(/prop-types\/MatchType$/, "model/Match", [
    replace({ default: "MatchType" }, "Match"),
  ]),
  rule(/prop-types\/ObjectType$/, "model/TemplateMatch", [
    replace({ default: "ObjectType" }, "TemplateMatch"),
  ]),
  rule(/prop-types\/PresetType$/, "model/Preset", [
    replace({ default: "PresetType" }, "Preset"),
  ]),
  rule(/prop-types\/RepoType$/, "model/Repo", [
    replace({ default: "RepoType" }, "Repo"),
  ]),
  rule(/prop-types\/SceneType$/, "model/Scene", [
    replace({ default: "SceneType" }, "Scene"),
  ]),
  rule(/prop-types\/TaskConfigType$/, "model/TaskConfig", [
    replace({ default: "TaskConfigType" }, "TaskConfig"),
  ]),
  rule(/prop-types\/TaskRequestType$/, "model/TaskRequest", [
    replace({ default: "TaskRequestType" }, "TaskRequest"),
  ]),
  rule(/prop-types\/TaskRequestTypes$/, "model/TaskRequestTypes", [
    replace({ default: "TaskRequestTypes" }, "TaskRequestTypes"),
  ]),
  rule(/prop-types\/TaskStatus$/, "model/TaskStatus", [
    replace({ default: "TaskStatus" }, "TaskStatus"),
  ]),
  rule(/prop-types\/TaskType$/, "model/Task", [
    replace({ default: "TaskType" }, "Task"),
  ]),
  rule(/prop-types\/TemplateExclusionType$/, "model/TemplateExclusion", [
    replace({ default: "TemplateExclusionType" }, "TemplateExclusion"),
  ]),
  rule(/prop-types\/TemplateType$/, "model/Template", [
    replace("TemplateType", "Template"),
    replace("TemplateExampleType", "TemplateExample"),
    replace("TemplateIconType", "TemplateIcon"),
  ]),
  remove(/^prop-types$/),
];

export function makeTypeMapping(
  rules: readonly Rule<ImportDeclaration>[]
): Map<string, string> {
  const mapping = new Map<string, string>();
  for (let rule of rules) {
    if (rule instanceof ImportRule) {
      for (let sym of rule.symbols) {
        mapping.set(sym.expected.name, sym.replace.name);
      }
    }
  }
  return mapping;
}

export const typeMappings = makeTypeMapping(importRules);
