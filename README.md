# Model Injector Pro

一个面向 Chromium 浏览器的独立 Manifest V3 扩展：在受支持的 ChatGPT 网页会话中提供模型选择、reasoning effort、上下文 token 估算和请求诊断控制。

Model Injector Pro is an independent, open-source browser extension for local model controls and diagnostics on supported ChatGPT web sessions.

## 独立性与使用边界

**This project is not affiliated with, endorsed by, or sponsored by OpenAI.** OpenAI、ChatGPT 及相关名称是其各自权利人的商标；本仓库仅为说明兼容目标而作必要引用。项目使用原创图标和视觉语言，不分发 OpenAI 标志或其结形商标图案。

本扩展不会解锁模型、绕过账号权限、规避服务端校验或改变订阅权益。它只能在浏览器本地对页面发起的相关请求进行有限调整；最终可用模型、参数接受情况和响应行为始终由目标网站及账号权限决定。请仅在你有权使用和测试的账号与环境中运行。

## 功能

- 原创悬浮启动器和可中断的打开、关闭动效。
- 本地启用或暂停请求参数覆盖。
- 预设、自定义及页面接口发现的模型选择。
- 为兼容模型选择 reasoning effort。
- 使用随包提供的 `o200k_base` tokenizer 在本地估算上下文占用。
- 对相关请求改写结果提供本地诊断；调试默认关闭。
- 使用页面本地存储保存偏好，不依赖项目方后端服务。
- 中英日俄界面与可配置强调色。

## 安装

### 从源码加载

1. 克隆或下载本仓库。
2. 在 Chrome、Edge 或其他 Chromium 浏览器打开扩展管理页。
3. 开启开发者模式。
4. 选择“加载已解压的扩展程序”。
5. 选择仓库中的 `extension/` 目录。
6. 打开或刷新 `https://chatgpt.com/`。

### 从 Release ZIP 加载

Release ZIP 解压后本身就是扩展根目录。不要直接选择 ZIP，也不要选择包含它的仓库根目录。

更完整的操作和排障说明见 [docs/USAGE.md](docs/USAGE.md)。

## 开发与验证

要求：Node.js 20+、Python 3.11+、Git。

```bash
npm run verify
npm run package
```

`npm run verify` 会检查 JavaScript 语法、manifest 与 package 版本、运行时白名单、图标完整性、敏感信息模式、旧品牌图形指纹、第三方依赖哈希，以及本地备份是否被 Git 正确忽略。

`npm run package` 会先验证源码，再生成可复现 ZIP，并再次验证 ZIP 内容。产物位于 `dist/`。

发布包严格只包含以下文件：

```text
manifest.json
config.js
content.js
libs/o200k_base.js
icons/icon-16.png
icons/icon-32.png
icons/icon-48.png
icons/icon-128.png
LICENSE
THIRD_PARTY_NOTICES.md
```

前 8 项是 manifest 引用的运行文件；末尾两项是随分发包提供的项目许可证和第三方许可声明。除此之外，备份、截图、预览图、设计源文件、文档、旧 ZIP 和 `output/` 均不会进入发布包。

## 项目结构

```text
.
├── extension/                 # 可直接加载的扩展源码
│   ├── manifest.json
│   ├── config.js
│   ├── content.js
│   ├── libs/o200k_base.js
│   └── icons/
├── docs/
│   ├── USAGE.md
│   ├── ARCHITECTURE.md
│   └── PRIVACY.md
├── scripts/
│   ├── verify_extension.py
│   └── package_extension.py
├── SECURITY.md
├── THIRD_PARTY_NOTICES.md
└── LICENSE
```

架构和信任边界见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 隐私与安全

- 项目不运行开发者控制的遥测或后端收集服务。
- 会话文本只在当前页面内用于本地 token 计算。
- 调试记录可能包含模型标识、请求路径及诊断元数据；不要公开分享未经检查的导出文件。
- 扩展运行在网页主世界中，目标网站更新可能导致兼容性、安全性或隐私假设变化。

详细说明见 [docs/PRIVACY.md](docs/PRIVACY.md)。安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告，不要在公开 Issue 中粘贴账号信息、Cookie、请求头或诊断导出。

## 贡献

提交更改前请至少运行：

```bash
npm run verify
```

涉及运行文件的 PR 必须同步更新相应文档、版本或第三方归属。不要提交浏览器资料目录、账号导出、私钥、访问令牌、抓包文件、个人路径或本地备份。

## 许可证

项目代码以 [MIT License](LICENSE) 发布。随包 tokenizer 的独立版权和许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 版权标识

当前项目使用的版权通知为：

```text
Copyright © 2026 simplez2
```

版权通知是权利人对作品归属的明确标识，不是需要先向 GitHub 或其他平台“领取”的认证。若实际权利人是个人、公司或组织，应将上面的主体名称，以及 `LICENSE` 中的对应版权行，替换为真实权利人；不要把 OpenAI 或 ChatGPT 写成该项目的权利人。开源并不会自动放弃版权，MIT License 只是向他人授予使用、修改和再分发代码的许可，同时要求保留版权和许可证明。

## 致谢

感谢 [Linux.do](https://linux.do) 社区提供的技术交流、问题反馈和开源讨论。
