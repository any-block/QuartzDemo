/** 作用: 所有的一级标题后面自动加上 🚀 图标 */

import { type QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Root } from "mdast"

// 这是标准的 remark 插件
const remark_rocket_heading = () => {
  return (tree: Root, _file: any) => {
    visit(tree, "heading", (node) => { // 遍历所有的 heading (标题) 节点
      if (node.depth === 1) { // 只处理一级标题 (depth === 1)
        const textNode = node.children.find((n) => n.type === "text") // 找到标题中的文本节点
        
        if (textNode && "value" in textNode) { // 如果存在文本，追加 emoji
          textNode.value += " 🚀"
        }
      }
    })
  }
}

// 这是 Quartz 的 Transformer 插件定义
export const RocketHeading: QuartzTransformerPlugin = () => {
  return {
    name: "RocketHeading",
    markdownPlugins() {
      return [
        remark_rocket_heading,
      ]
    },
  }
}
