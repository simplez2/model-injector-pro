# Model Injector Pro

**把模型控制、请求诊断和浏览器环境一致性，收进一个本地扩展。**

Model Injector Pro 是一款独立、开源、面向 Chromium 浏览器的 Manifest V3 扩展。它为受支持的 ChatGPT 网页会话提供模型选择、reasoning effort、上下文 token 估算、请求改写诊断，以及时区与语言环境的一致性控制。

Model Injector Pro is an independent, open-source Manifest V3 extension that brings local model controls, reasoning-effort selection, context estimation, request diagnostics, and browser-environment consistency tools to supported ChatGPT web sessions.

[下载最新版本](https://github.com/simplez2/model-injector-pro/releases/latest) · [安装与使用](docs/USAGE.md) · [隐私边界](docs/PRIVACY.md)

> **先对齐环境，再判断模型。** 它不承诺让模型凭空变聪明，而是尽量避免时区、语言、请求头和页面运行时彼此矛盾，让模型选择是否生效、响应是否被路由、页面为何表现异常，都更容易被看见和验证。

## 独立性与使用边界

**This project is not affiliated with, endorsed by, or sponsored by OpenAI.** OpenAI、ChatGPT 及相关名称是其各自权利人的商标；本仓库仅为说明兼容目标而作必要引用。项目使用原创图标和视觉语言，不分发 OpenAI 标志或近似商标图案。

本扩展是浏览器本地控制与诊断工具，不是权限绕过工具。它不会：

- 解锁账号原本不可用的模型或功能；
- 绕过订阅、配额、地区或服务端权限；
- 规避服务端校验、风控或安全机制；
- 保证目标网站接受被修改的模型和推理参数；
- 隐藏真实 IP，或完整消除浏览器与网络指纹。

扩展只能在浏览器本地对相关页面状态和请求进行有限处理。最终可用模型、参数接受情况、路由结果和响应行为，始终由目标网站、服务端策略及账号权限决定。请仅在你有权使用和测试的账号与环境中运行。

## 核心能力

### 模型与推理控制

- 集中展示预设模型、自定义模型和页面接口发现的模型。
- 对同名或近似名称进行消歧，保留实际模型标识，减少误选。
- 为兼容的推理模型设置 reasoning effort，并显示实际写入的强度。
- 可随时暂停请求覆盖，不影响页面继续正常使用。

### 请求诊断与可观测性

- 检查 fetch、XHR、SSE、NDJSON 和 JSON 路径中的请求改写与响应模型信息。
- 区分“已请求的模型”和“响应暴露的模型”；两者不一致时，以红色悬浮状态提醒。
- 显示 Workspace Agent、system hint、改写状态和失败原因等本地诊断信息。
- PoW 诊断读取 `chat-requirements` 准备响应中的 difficulty，并同时显示十六进制原值和十进制换算；不读取模型回复，也不保存或展示 seed、proof 与相关令牌。
- 调试模式默认关闭；诊断记录仅保存在当前页面内存中，关闭调试后清除。

### 上下文估算与本地偏好

- 使用随包提供的 `o200k_base` tokenizer 在本地估算上下文占用。
- 显示消息数、已用 token、剩余 token 和当前上下文上限。
- 偏好保存在页面本地存储中，不依赖项目方后端或遥测服务。

### 界面与交互

- 原创悬浮启动器，以及可中断、可反向衔接的打开和关闭动效。
- 支持中文、英文、日文和俄文界面，长文本与窄屏布局经过单独适配。
- 支持自定义强调色、键盘操作和响应式面板布局。

### 环境一致性与隐私模式

- 提供时区与主语言自定义下拉，也可根据出口 IP 地理信息自动匹配。
- 对齐 `navigator`、`Intl`、`Date` 本地 getter、`Temporal.Now`、`<html lang>` 与 `Accept-Language`。
- 覆盖顶层页面、匹配的 iframe、`about:blank` iframe、Blob Worker 和 SharedWorker。
- 关闭后恢复原生行为；反复开关不会叠加 wrapper 或人为制造时间漂移。

## “防降智”的作用和边界

“防降智”是本项目对**浏览器环境一致性**功能的通俗称呼，不代表扩展能够提高模型能力。它不修改模型权重、提示词或服务端推理过程，处理的是页面能够读取到的时区、语言和请求偏好相互矛盾的问题。

浏览器向网页暴露的环境信息分散在多个接口中。例如，`navigator.language` 可能显示英语，默认 `Intl` 却使用另一种语言格式化；页面显示的时区已经改变，`Date#getHours()` 和 `getTimezoneOffset()` 仍来自系统时区；主页面、iframe、Worker 与请求中的 `Accept-Language` 也可能各自返回不同结果。这些情况不会让模型本身变笨，但可能导致：

- 页面使用错误的语言、日期格式或时间；
- 同一会话的不同区域显示出互相矛盾的地区信息；
- 页面依据环境信息进入不同的功能分支；
- 请求诊断难以区分是模型、路由还是浏览器环境出了问题。

启用隐私模式后，扩展会在其能够控制的范围内对齐这些信号：

- 同步 `navigator.language`、`navigator.languages`、默认 `Intl` locale 和 `<html lang>`；
- 同步时区、`Date` 本地时间 getter、时区偏移、日期字符串和 `Temporal.Now`；
- 为受支持的页面请求设置一致的 `Accept-Language`；
- 尽量将相同设置应用到主页面、匹配的 iframe、Blob Worker 和 SharedWorker；
- 关闭隐私模式时恢复原生行为，避免重复包装或累计时间偏移。

隐私模式默认关闭，需要用户主动启用。它的目标是减少错误本地化、时间显示冲突和环境判断误差，让页面行为与请求诊断更容易解释，而不是改变服务端实际使用的模型。

### 这项功能不能做什么

- 不能提升模型的推理能力，也不能保证回答质量；
- 不能解锁模型、账号权限、订阅权益或地区限制；
- 不能强制服务端接受指定模型、reasoning effort 或其他请求参数；
- 不能改变服务端路由、配额、风控和安全策略；
- 不能隐藏真实 IP，也不能提供完整的浏览器指纹匿名化；
- 不能完全接管原生 Service Worker、WebRTC、系统字体、GPU/图形栈和网络层暴露的信息。

浏览器或目标网站更新后，也可能出现新的环境接口或检测方式，需要后续版本继续适配。因此，这项功能应理解为有限范围内的环境一致性处理，而不是模型增强或完整的隐私防护方案。

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
content-bridge.js
background.js
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
