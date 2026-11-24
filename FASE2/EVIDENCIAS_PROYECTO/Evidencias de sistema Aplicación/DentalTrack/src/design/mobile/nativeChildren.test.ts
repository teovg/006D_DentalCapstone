/// <reference types="node" />
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { expect, it } from "vitest";

function invalidNativeChildren(file: string, text: string): string[] {
  const invalid: string[] = [];
  const structural = new Set(["View", "ScrollView", "Page", "Surface", "Section", "ModalBackground"]);
  const source = ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const host = (node: ts.Node): string => {
    let parent: ts.Node | undefined = node.parent;
    while(parent) {
      if(ts.isJsxElement(parent)) return parent.openingElement.tagName.getText(source);
      parent=parent.parent;
    }
    return "";
  };
  const visit = (node: ts.Node) => {
    const rawExpression = ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) && node.expression &&
      ((ts.isStringLiteral(node.expression) && node.expression.text.length>0) || ts.isNumericLiteral(node.expression));
    const rawText = ts.isJsxText(node) && node.text.trim().length>0;
    if((rawExpression||rawText) && structural.has(host(node))) {
      const line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
      invalid.push(`${file}:${line} raw text in ${host(node)}`);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
  return invalid;
}

it("detects the native crash without treating Text or input props as layout children",()=>{
  expect(invalidNativeChildren("before.tsx",'<View><>{" "}</><View /></View>')).toHaveLength(1);
  expect(invalidNativeChildren("valid.tsx",'<View><Text>{" "}</Text><Input placeholder={" "}/></View>')).toEqual([]);
});

it("active mobile screens never render explicit raw text under native layout hosts",()=>{
  const folder=new URL("./",import.meta.url);
  const invalid=readdirSync(folder).filter(name=>name.endsWith(".tsx")).flatMap(file=>invalidNativeChildren(file,readFileSync(new URL(file,folder),"utf8")));
  expect(invalid).toEqual([]);
});
