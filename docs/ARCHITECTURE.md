# 架构说明

## 设计目标

Model Injector Pro 是无后端的 Manifest V3 页面扩展。设计目标是：

- 在目标网页现有会话流程中提供可撤销的本地控制。
- 不申请超出兼容所需的浏览器权限。
- 不引入项目维护者控制的远程服务或遥测。
- 让发布包可以由固定白名单复现和审计。
- 在目标网站快速变化时，以失败关闭和清晰诊断优先。

本项目是独立兼容工具，与 OpenAI 无隶属、授权、背书或赞助关系。

## 运行边界

扩展运行文件固定为：

```text
extension/
├── manifest.json
├── config.js
├── content.js
├── libs/o200k_base.js
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

`manifest.json` 是脚本加载顺序和时机的权威来源。脚本在页面 `MAIN` world 执行，使网络兼容层能够观察页面自己的 `fetch` 和 `XMLHttpRequest`。这也意味着代码与页面处于同一 JavaScript 信任边界，不应把页面内状态当作隔离秘密。

## 组件

### `config.js`

提供极小的可选配置表面：

- Sponsor 模块默认关闭且链接为空。

公开发行版应保持 Sponsor 默认关闭。配置项不能成为密钥存储位置。

### `libs/o200k_base.js`

包含 `gpt-tokenizer` 3.4.0 的浏览器 bundle，通过 `window.GPTTokenizer_o200k_base` 暴露编码和计数能力。它只在页面本地处理文本，不需要把会话内容发送给额外服务。

该 bundle 的版本、许可证和 SHA-256 固定在 `THIRD_PARTY_NOTICES.md`，验证脚本会检查哈希，升级依赖时必须同步更新归属和预期哈希。

### `content.js`

当前采用单文件运行架构，内部职责包括：

- 状态读取、净化、持久化和跨标签页同步。
- 模型目录、接口发现结果和自定义项归一化。
- 相关请求识别、payload 改写和响应诊断。
- 悬浮启动器、主面板、设置、键盘与拖动交互。
- 会话 DOM 观察与本地 token 统计。

单文件减少 Manifest V3 加载和打包复杂度，但也提高回归风险；修改时应通过小范围函数边界、事件去重和自动验证保持可维护性。

## 数据流

```text
用户操作
  │
  ▼
面板状态 ───────► 页面 localStorage
  │
  ├─────────────► 模型菜单与诊断视图
  │
  ▼
相关请求识别 ───► payload 有限改写 ───► 目标网站原请求
  │                                      │
  └───────────── 本地诊断 ◄──────────────┘

会话 DOM ───────► 本地 tokenizer ───────► 上下文占用显示
```

### 状态与存储

扩展状态使用 `cgpt_v12_` 前缀保存在目标页面 `localStorage`。写入前应对字符串、数组、位置和接口发现数据做大小或类型限制。调试关闭时不应继续累积抓包记录。

### 网络兼容层

运行时保存原生网络函数引用，再为相关路径安装 wrapper。wrapper 的核心约束是：

1. 不命中支持路径时原样转发。
2. 只处理能够安全解析和重建的 payload。
3. 任何一次页面请求最多发送一次；解析或诊断失败不能触发重试。
4. 不把目标站点凭据转发给项目控制的域名。
5. 目标网站返回的状态码和异常应尽量原样传递。

模型目录发现读取同源接口响应的 clone，不消费页面原响应。用户刷新模型目录时，扩展会向目标网站的模型接口发起一次同源 GET 请求；为兼容站点路由，它可能临时复用页面现有模型请求中的 `authorization`、`chatgpt-account-id`、客户端版本、语言和路由请求头。

这些请求头只存在于当前页面内存中的 `modelsRequestSnapshot`，不会写入 `localStorage`、诊断导出或项目方后端，并且只会随目标网站同源的模型目录请求发回。页面刷新或页面上下文销毁后，该内存快照随之消失。

### DOM 与 UI

UI 创建在扩展自己的宿主节点中。会话内容观察器只应对可能影响消息或 Agent 列表的变更安排工作，并对 token 计算和目录扫描做防抖、空闲调度或范围限制，避免对整页每次 mutation 全量扫描。

动画以可中断的 `transform` 和 `opacity` 为主，尊重 `prefers-reduced-motion`。拖动期间应合并到 animation frame，结束时再持久化位置。

## 隐私与信任模型

- 页面正文会在本地进入 tokenizer，但不由本项目上传到额外后端。
- 页面本身可以观察 `MAIN` world 的 JavaScript 和同源 DOM 属性。
- 诊断导出属于用户主动动作，导出内容不应默认视为可公开数据。
- Sponsor 链接属于显式导航；公开配置默认不显示。
- 浏览器和目标网站仍控制 Cookie、登录状态及实际网络传输。

更详细的数据类别和清理方式见 [PRIVACY.md](PRIVACY.md)。

## 验证与发布

`scripts/package_extension.py` 不遍历目录：manifest 引用的 8 项由固定 `RUNTIME_FILES` 管理，`LICENSE` 与 `THIRD_PARTY_NOTICES.md` 由独立 `LEGAL_FILES` 管理，两者合并为固定 `ARCHIVE_FILES`。ZIP 使用固定时间戳、固定顺序和固定权限位，使相同源码产生可复现内容。

`scripts/verify_extension.py` 检查：

- manifest 引用与运行白名单完全相等。
- package 和 manifest 版本一致。
- 每个运行文件存在、位于 `extension/` 内且不是符号链接。
- 发布包没有备份、输出、截图、嵌套 ZIP 或私钥文件。
- 公共文本没有高置信度密钥、个人路径或旧 OpenAI 结形图案指纹。
- tokenizer bundle 的版本归属和 SHA-256 未漂移。
- CI 中的 Git tracked tree 与公开仓库固定白名单完全一致。

GitHub Actions 以只读仓库权限运行同一验证和打包流程，生成的 artifact 仍应在发布前由维护者检查。

## 已知限制

- 目标网站的 DOM、请求路径和 payload 都不是稳定公共 API。
- 页面主世界无法提供与独立扩展上下文相同的隔离保证。
- 客户端改写无法改变服务端授权或产品策略。
- 本地 token 统计可能与服务端隐藏消息和计费口径不同。
