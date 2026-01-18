// 1. quartz
import { createMdProcessor, type QuartzMdProcessor } from "../../processors/parse"
import { type QuartzTransformerPlugin } from "../types"
import { type BuildCtx } from "../../util/ctx"
import { type FilePath } from "../../util/path"

// 2. unified
import { type Plugin, type Processor, unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import remarkRehype from 'remark-rehype'

import { Root, RootContent, Paragraph, Text, Code, Html } from "mdast"
import rehypeStringify from 'rehype-stringify'
import { toMarkdown } from "mdast-util-to-markdown" // TODO 这里好像会有 document 依赖
  // 而且不一定能反序列化成功 (有私有节点类型，甚至table类型都不能识别)
  // 后期需要去除此 "修改树" 的 `transformer` / `mdast-util` 插件
  // 修改成 `micromarkExtensions` 形式的插件
import { type VFile } from "vfile"

// 3. AnyBlock
// import deasync from 'deasync'
import { ABReg } from "../../../../ABConverter/ABReg"
import {
  ABConvertManager,
  jsdom_init,
  // transformer_anyblock as ab_1,
  remark_anyblock_render_codeblock,
} from "@anyblock/remark-any-block"
jsdom_init()

/**
 * 大部分选项是为了与 markdown-it 版本保持一致而保留的。
 * 目前这些选项未被使用，但已预留用于未来的行为切换。
 */
export interface AnyBlockOptions {}

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
 * 也可用 import remarkDirective from 'remark-directive'; 来代替之
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
 * remark 插件: 缓存当前处理文件的路径到全局变量 `global_path` 中
 */
const captureFileContext: Plugin<[], Root> = () => {
  return (_tree, file) => {
    if (file.path) global_path = file.path
  }
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
        node_next.type === "code" ||
        node_next.type === "blockquote"
        // node_next.type === "table"
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

    // step2. 检测头尾语法之 `[]` + heading 语法
    if (header) {
      const node_next = children[i+1];
      if (
        node_next.type === "heading"
      ) {
        const nodes: RootContent[] = [node_next];
        const i_cache = i;
        i = i + 2
        for (; i < children.length; i++) { // 找结束标志
          const node_next_j = children[i]
          if (node_next_j.type == "heading" && node_next_j.depth < node_next.depth) {
            break
          }
          if (!["mdxjsEsm"].includes(node_next_j.type)) nodes.push(node_next_j)
        }
        const codeValue = `[${header}]\n${nodesToMarkdown(nodes)}`;
        out.push({
          type: "code",
          lang: "anyblock",
          value: codeValue,
          data: { markup: "[]" },
        });
        // TODO
        // 部分环境 (Docusaurus不行，Quartz可以) 目前不能将标题给去掉，否则 toc 会报错: `can't access property "length", toc is undefined`
        // 后面想想有没有什么办法能解决这个问题，感觉要预处理文档才行
        i=i-1; continue;
        // i=i_cache; continue;
      } else {}
    }

    // step3. 检测 `:::` 语法
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

    // step4. 不处理的节点，保持不变
    out.push(node)
  }

  (tree as Root).children = out;
}

let processor: QuartzMdProcessor|any|'flag'|undefined
let global_path: string = ''

// 这是 Quartz 的 Transformer 插件定义
// export const transformer_anyblock: QuartzTransformerPlugin = ab_1
export const transformer_anyblock: QuartzTransformerPlugin = (/*options: any*/) => {
  return {
    name: "AnyBlock",

    markdownPlugins(_ctx: BuildCtx) { // 一般只初始化一次，但 createMdProcessor 也会重新触发之 (注意避免递归触发)
      if (processor === undefined) {
        // processor
        // processor = 'flag' // 要先给 'flag'，避免下一步递归
        // // 尝试复用 processor，复用已经配置好了的插件，避免插件效果丢失
        // // 但注意: 这里返回的只是 Markdown 阶段 的处理器（Remark 处理器），而非全流程的处理器
        // // 还需要手动给这个 processor 补全 后半截流程
        // const baseProcessor = createMdProcessor(ctx)
        // // 关键修复: 补全 "Markdown -> HTML" 的转换桥梁
        // // allowDangerousHtml: true 允许 markdown 中内嵌的 html 标签不被转义
        // baseProcessor.use(remarkRehype, { allowDangerousHtml: true })
        // // 关键修复: 确保 processor 有 Compiler (Stringify)，否则 .process() 会报错
        // // 如果 baseProcessor 已经包含了 stringify，这一步可能多余，但加上通常无害(或覆盖)
        // // 也可以检查 baseProcessor.Compiler 是否存在
        // baseProcessor.use(rehypeStringify)        
        // processor = baseProcessor
        processor = unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkMath)
          .use(remarkBreaks)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeStringify)
        if (!processor.compiler) {
          processor.compiler = (tree: unknown) => tree as any
        }

        ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement): void => {
          if (processor === 'flag' || processor === undefined) return
          // 使用全功能 Processor 解析
          // 
          // 路径问题:
          // 关键点：processor.process / processor.processSync 依然需要一个 path
          // 即使文件不存在，通常也需要提供一个"逻辑路径"，
          // 这样如果内容里有相对链接 (如 [link](./other-note))，处理器才能正确计算链接。
          // 如果确定没有相对链接，可以用当前文件的路径 (file.path) 或一个假路径。
          // 
          // 异步问题:
          // 这里复用的 createMdProcessor(ctx) 会包含异步操作
          // 如果使用 processor.processSync 需要保证 processor 中的插件都是同步的，也就是说要重新构造 unified
          // 且这个过程可能会丢失部分插件特性
          // 初始渲染使用异步是对的，这样可以多个文件并行解析渲染处理。但对于同一个文件的多次渲染、嵌套渲染，只能同步
          // 
          // 返回值:
          // result主要属性: cwd, data { filePath, slug, frontmatter, dates }, history, messages, value
          //   其中 value 是最终的 HTML_string
          const result: VFile = processor.processSync({
            value: markdown,
            path: global_path  || 'index.md', // 当前文件所在路径
            data: {
              filePath: (global_path || 'index.md') as FilePath, // 关键修复: 显式设置 data.filePath，Quartz 插件通常依赖这个属性
              slug: "temp-slug" as any
            }
          })

          el.innerHTML = result.value as string
        })
      }

      return [
        captureFileContext, // 在处理链最前面添加捕获路径的插件
        remark_anyblock_to_codeblock,
        remark_anyblock_render_codeblock, // last
        // ab_3(), // last
      ]
    },
    htmlPlugins(_ctx: BuildCtx) {
      return []
    },
    // textTransform?: (ctx: BuildCtx, src: string) => string,
    // externalResources?: ExternalResourcesFn,
  }
}
