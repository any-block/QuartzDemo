import { Plugin } from "unified"
import { Root, RootContent, Paragraph, Text, Code, Html } from "mdast"
import { toMarkdown } from "mdast-util-to-markdown"

import { type QuartzTransformerPlugin } from "../types"
import { type BuildCtx } from "../../util/ctx"

// AnyBlock
import { ABReg } from "../../../../ABConverter/ABReg"
import {
  // ABConvertManager,
  jsdom_init,
  // transformer_anyblock as ab_1,
  remark_anyblock_render_codeblock,
 } from "@anyblock/remark-any-block"
jsdom_init()

/**
 * 大部分选项是为了与 markdown-it 版本保持一致而保留的。
 * 目前这些选项未被使用，但已预留用于未来的行为切换。
 */
export interface AnyBlockOptions {
}

/**
 * 检测 `[header]` 段落
 */
function matchAbHeader(node: RootContent): string | null {
  if (node.type !== "paragraph") return null;

  const text = (node.children as RootContent[])
    .map((c) => (c.type === "text" ? (c as Text).value : ""))
    .join("");
  const match = text.match(ABReg.reg_header_noprefix);
  if (!match || !match.length) return null

  return match[5]
}

/**
 * 检测 `:::container` 首段落
 * 匹配时返回 `{flag, type}`
 */
function matchContainerStart(node: RootContent):
  | { flag: string; type: string }
  | null {
  if (node.type !== "paragraph") return null;
  const text = (node.children as RootContent[])
    .map((c) => (c.type === "text" ? (c as Text).value : ""))
    .join("")
    .trim();
  const m = text.match(ABReg.reg_mdit_head);
  if (!m || !m[3] || !m[4]) return null;
  return { flag: m[3], type: m[4] };
}

/**
 * 检测 `:::container` 尾段落
 */
function matchContainerEnd(node: RootContent, flag: string): boolean {
  if (node.type !== "paragraph") return false;
  const text = (node.children as RootContent[])
    .map((c) => (c.type === "text" ? (c as Text).value : ""))
    .join("")
    .trim();
  return text === flag;
}

/**
 * 将一组 mdast 节点反序列化为 markdown 格式
 */
function nodesToMarkdown(nodes: RootContent[]): string {
  return toMarkdown(
    { type: "root", children: nodes } as unknown as Root,
    { listItemIndent: "one" }
  ).trimEnd();
}

/**
 * remark 插件: 将任何特殊的 AnyBlock 语法转换为带有 `lang = "AnyBlock"` 属性的“代码”节点。
 *
 * - `[header]` + (list|heading|code|blockquote|table...)
 * - `:::type ... :::`
 */
export const remark_anyblock_to_codeblock: Plugin<[Partial<AnyBlockOptions>?], Root> =
  (_options = {}) => (tree) =>
{
  const children = [...tree.children] as RootContent[];

  const out: RootContent[] = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];

    // step1. 检测 `[]` 语法
    const header = matchAbHeader(node);
    if (header) {
      const node_next = children[i+1];
      if (
        node_next.type === "list" ||
        node_next.type === "heading" ||
        node_next.type === "code" ||
        node_next.type === "blockquote" ||
        node_next.type === "table"
      ) {
        const codeValue = `[${header}]\n${nodesToMarkdown([node_next])}`;
        out.push({
          type: "code",
          lang: "anyblock",
          value: codeValue,
          data: { markup: "[]" },
        } as Code);
        i++; continue;
      } else {}
    }

    // step2. 检测 `:::` 语法
    const container = matchContainerStart(node);
    if (container) {
      const body: RootContent[] = [];
      let j = i + 1;
      for (; j < children.length; j++) {
        const n = children[j];
        if (matchContainerEnd(n, container.flag)) {
          break;
        }
        body.push(n);
      }
      if (j < children.length) {
        const codeValue = `[${container.type}]\n${nodesToMarkdown(body)}`;
        out.push({
          type: "code",
          lang: "anyblock",
          value: codeValue,
          data: { markup: container.flag },
        } as Code);
        i = j; continue;
      }
    }

    // step3. 不处理的节点，保持不变
    out.push(node)
  }

  (tree as Root).children = out;
}

{
  // ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement):void => {
  // })
}

// 这是 Quartz 的 Transformer 插件定义
// export const transformer_anyblock: QuartzTransformerPlugin = ab_1
export const transformer_anyblock: QuartzTransformerPlugin = (/*options: any*/) => {
  return {
    name: "AnyBlock",
    markdownPlugins(_ctx: BuildCtx) {
      return [
        remark_anyblock_to_codeblock,
        remark_anyblock_render_codeblock,
        // remark_anyblock_render_codeblock, // last
        // ab_3(), // last
      ]
    },
    htmlPlugins(_ctx: BuildCtx) {
      return []
    }
  }
}
