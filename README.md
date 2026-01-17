# AnyBlock Quartz Demo

此项目测试于 Quartz 的 e6cc9ba3683897f899cd0b514ba9e54f72d0de8a 版本

当前不足

> 目前主要是一个问题：
> 
> 碍于 quartz 的 api 和流程限制，再渲染那块，始终没办法做完美
> 
> 如表格的单元格、卡片组的卡片、标签组的内容，里面会是一个再渲染的 markdown，那部分的渲染无法使用所有插件

## 构建该demo项目

(由于 Quartz 版本的项目创建方式得 clone，为避免该仓库臃肿，该项目不包含 Quartz，也不支持直接构建，你应该使用下一章的内容)

## 从零创建该项目

1. 先搭建 [Quartz](https://github.com/jackyzha0/quartz) 项目

```bash
node -v     # >= v22
npm -v      # >=10.9.2

git clone https://github.com/jackyzha0/quartz.git # 官方文档是这样写的，但我推荐先去仓库  use this template 再去 clone 创建的新仓库，以去除git历史
cd quartz
npm i
npx quartz create
# Empty Quartz (default)
# Treat links as shortest path (default)
```

1.1. 清空不必要的内容 (可选)

> [!note]
> 我认为文档中的做法比较原始和笨重，带来了很多不需要的历史包袱和文件。
> 如: git 历史、quartz 文档等，而且也不太利于后续更新该库
> 
> 我认为应该像 vuepress/vitepress 等更成熟的SSG框架学习。
> 如: 使用 npm 管理项目的版本、使用 `npm create` (脚手架/模板仓库) 的方式来变更
> 
> 当然直接整个clone的好处是该项目的任何部分都可以很方便地修改 (在vuepress中这种需求使用的是 "别名替换" 功能);
> 但这样不利于后续更新，且大多数人只需要插件系统就可以了。总的来说使用 clone 方式弊大于利

推荐删除: `docs/`、`.git/`

2. 添加示例内容 (方便查看是否成功)

在clone的quartz项目所在路径下:

```bash
# 在clone的quartz项目所在路径下
echo -e "\n[list2table]\n\n- 1\n- 2\n  - 3\n  - 4\n" >> ./content/index.md
```

3. 安装使用 AnyBlock 的 Remark 插件

就像使用普通的 remark 插件那样使用

3.1. 安装依赖 (临时, 后续会有 remark 版本的 any-block 包)

```bash
npm install @anyblock/remark-any-block
# 后续如果编译时发现有依赖丢失再补充 npm install
# npm install markdown-it

# 旧
# npm install markdown-it-any-block@latest
# npm install rehype-stringify
# # 保留 /ABConverter
# # 将 /plugins/transgormers/ 复制到 /quartz/quartz/plugins/transgormers/
```

3.2. 启用插件

quartz.config.ts

```js
// import { RocketHeading } from "./quartz/plugins/transformers/rocketHeading" // [!code ++]
import { transformer_anyblock } from "./quartz/plugins/transformers/anyblock"

const config: QuartzConfig = {
  plugins: {
    transformers: [
      // RocketHeading(), // [!code ++]
      transformer_anyblock(), // [!code ++]
    ],
  },
}
```

3.3. 启用样式文件

quartz/styles/custom.scss 添加:

```scss
@import '../node_modules/@anyblock/remark-any-block/styles';

// 适配 Quartz 和 anyblock 样式
.ab-note > .table-container > table {
    margin-left: 0;
    margin-right: 0;
}
.ab-note {
    margin: 10px 0;
}
```

> [!WARNING]
> 
> 注意，构建出来的只有对应的dom结构，而没有样式。因为纯markdown-it插件是不含样式的（除非用内联样式），自己引用一下就好
> 
> 例如vuepress中可以创建/修改 `src/.vuepress/styles/index.scss`
> 并添加: `@import '../../../node_modules/markdown-it-any-block/styles';`
> 
> 例如vitepress可以添加 [theme](https://github.com/any-block/VitePressDemo/blob/main/.vitepress/theme) 文件夹及里面的内容

4. 检查

```bash
# 在clone的quartz项目所在路径下
npx quartz build --serve
```
