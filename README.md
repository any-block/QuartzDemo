# AnyBlock Quartz Demo

此项目测试于 Quartz 的 e6cc9ba3683897f899cd0b514ba9e54f72d0de8a 版本

## 构建该demo项目

(由于 Quartz 版本的项目创建方式得 clone，为避免该仓库臃肿，该项目不包含 Quartz，也不支持直接构建，你应该使用下一章的内容)

## 从零创建该项目

1. 先搭建 [Quartz](https://github.com/jackyzha0/quartz) 项目

```bash
node -v     # >= v22
npm -v      # >=10.9.2

git clone https://github.com/jackyzha0/quartz.git
cd quartz
npm i
npx quartz create
# Empty Quartz (default)
# Treat links as shortest path (default)
```

1.2. 清空不必要的内容 (可选)

我认为文档中的做法比较原始和笨重，带来了很多不需要的历史包袱和文件。
如: git 历史、quartz 文档等，而且也不太利于后续更新该库

我认为应该像 vuepress/vitepress 等更成熟的SSG框架学习。
如: 使用 npm 管理项目的版本、使用 `npm create` (脚手架/模板仓库) 的方式来变更

当然直接整个clone的好处是该项目的任何部分都可以很方便地修改 (在vuepress中这种需求使用的是 "别名替换" 功能);
但这样不利于后续更新，且大多数人只需要插件系统就可以了。总的来说使用 clone 方式弊大于利

推荐删除: `docs/`、`.git/`

2. 添加示例内容 (方便查看是否成功)

在clone的quartz项目所在路径下:

```bash
# 在clone的quartz项目所在路径下
echo -e "\n[list2table]\n\n- 1\n- 2\n  - 3\n  - 4\n" >> ./content/index.md
```

1. 安装使用AnyBlock **(开发中)**

就像使用普通的 remark 插件那样使用

3.1. 安装依赖 (临时, 后续会有 remark 版本的 any-block 包)

```bash
npm install markdown-it-any-block@latest
npm install markdown-it
npm install rehype-stringify
# # 保留 /ABConverter
# # 将 /plugins/transgormers/ 复制到 /quartz/quartz/plugins/transgormers/
```

3.2. 启用插件

quartz.config.ts

```js
import { RocketHeading } from "./quartz/plugins/transformers/rocketHeading" // [!code ++]

const config: QuartzConfig = {
  plugins: {
    transformers: [
      RocketHeading(), // [!code ++]
    ],
  },
}
```

3.3. 启用样式文件

1. 检查

```bash
# 在clone的quartz项目所在路径下
npx quartz build --serve
```
