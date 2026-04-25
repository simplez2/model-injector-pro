# ChatGPT Model Injector Pro

ChatGPT Model Injector Pro 是一个 Manifest V3 浏览器扩展项目，用于在 ChatGPT 网页中提供本地浮动控制面板，辅助进行模型参数选择、reasoning effort 切换、模型列表发现和上下文 token 估算。

> 重要说明：本项目不会绕过服务端权限，也不会解锁账号没有权限使用的模型。浏览器端只能修改本地页面请求参数，最终是否可用仍由 ChatGPT 服务端、账号权限和当前产品策略决定。请仅在自己有权访问和测试的账号、环境中使用。

## 当前状态

本仓库已经完成基础整理和分批补传：

- 已移除原始压缩包中的 `.git`、临时 patch、损坏恢复文件和测试输出。
- 已补齐可运行的 `extension/content.js` 主脚本。
- 已补齐 `extension/libs/o200k_base.js` 兼容 tokenizer 层，用于轻量 token 估算。
- 已补齐 `package.json`、校验脚本、打包脚本和 GitHub Actions workflow。
- 已补齐 README、使用指南、架构说明和迭代优化文档。
- 当前仓库内容以已提交文件为准，校验流程会基于最新提交重新验证扩展结构。

## 功能

- 在 `chatgpt.com` / `chat.openai.com` 页面注入浮动控制面板。
- 支持启用/暂停本地请求参数覆盖。
- 支持预设模型、自定义 model slug 和在线模型列表发现。
- 捕获 `/backend-api/models` 返回并归一化模型信息。
- 支持 reasoning 模型的 effort 参数：Light / Standard / Extended / Heavy。
- 提供上下文 token 估算和上下文窗口比例提示。
- 使用浏览器本地存储保存配置，不依赖后端服务。

## 项目结构

```text
.
├── extension/
│   ├── manifest.json              # Chrome / Edge 扩展清单
│   ├── config.js                  # 可调整的运行配置
│   ├── content.js                 # 核心注入逻辑与 UI
│   └── libs/o200k_base.js         # tokenizer 兼容层
├── docs/
│   ├── USAGE.md                   # 使用指南
│   ├── ITERATION.md               # 迭代优化文档
│   ├── ARCHITECTURE.md            # 架构说明
│   ├── usage-guide.md             # 旧版链接兼容文档
│   └── iteration-plan.md          # 旧版链接兼容文档
├── scripts/
│   ├── verify_extension.py        # 项目校验脚本
│   └── package_extension.py       # 生成扩展发布 zip
├── .github/workflows/verify.yml   # GitHub Actions 校验流程
├── .gitignore
└── package.json
```

## 快速开始

1. 打开 Chrome 或 Edge。
2. 进入扩展管理页：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
3. 打开“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本仓库下的 `extension/` 目录。
6. 打开或刷新 `https://chatgpt.com/`。
7. 页面右下角会出现 `MI` 浮动按钮，点击后可打开控制面板。

更完整的安装、配置和排障流程见 [docs/USAGE.md](docs/USAGE.md)。

## 开发与校验

本项目不需要构建步骤，直接加载 `extension/` 即可运行。建议提交前执行：

```bash
npm run verify
```

生成可发布的扩展压缩包：

```bash
npm run package
```

输出文件位于 `dist/`，压缩包内容只包含扩展运行所需文件。

## 迭代方向

后续建议按以下顺序优化：

1. 将 `content.js` 拆分为网络拦截、状态管理、UI 渲染、token 估算等模块。
2. 引入更完整的 tokenizer bundle 或在构建阶段生成精简 tokenizer 资源。
3. 增加自动化测试，覆盖请求 payload patch、模型列表归一化和 token 估算。
4. 补齐正式图标 PNG 资源与截图素材。
5. 添加 release workflow，自动生成扩展发布包。

详细路线图见 [docs/ITERATION.md](docs/ITERATION.md)。
