# 架构说明

ChatGPT Model Injector Pro 是一个 Manifest V3 浏览器扩展。当前版本不依赖后端服务，所有逻辑都运行在 ChatGPT 页面上下文中。

## 目录结构

```text
extension/
├── manifest.json
├── config.js
├── content.js
└── libs/
    └── o200k_base.js
```

## 入口

`extension/manifest.json` 通过 `content_scripts` 注册三个脚本：

1. `config.js`
2. `libs/o200k_base.js`
3. `content.js`

它们在 `document_start` 阶段以 `world: MAIN` 注入页面，便于 patch 页面原生的 `fetch` 与 `XMLHttpRequest`。

## 配置层

`config.js` 暴露 `window.MI_CONFIG`，用于保存运行期开关，例如 sponsor 链接、账号信息抓取等。

当前仓库中的主脚本主要使用本地状态，不强依赖 `MI_CONFIG`，但保留这个入口方便后续扩展。

## 状态管理

当前状态保存在 `localStorage` 中，key 前缀为：

```text
cgpt_mi_
```

主要状态包括：

- `enabled`：是否启用请求参数覆盖。
- `model`：当前模型选择。
- `customModel`：自定义 model slug。
- `effort`：reasoning effort。
- `debug`：是否输出调试日志。
- `discovered`：从 API 捕获的模型列表。
- `lastAccount`：最近一次账号信息响应。

## 网络拦截

`content.js` 安装两类 hook：

- `window.fetch`
- `XMLHttpRequest.prototype.open/send`

### 模型发现

当请求 URL 包含：

```text
/backend-api/models
```

脚本会 clone response 并尝试解析 JSON，然后递归提取模型数据，归一化为：

```js
{
  id,
  name,
  effort,
  tokens,
  source: 'api'
}
```

### 请求 patch

当 URL 命中会话相关 endpoint，且 body 是 JSON 字符串时，脚本会按当前状态修改 payload：

- 写入 `model`
- 写入 `model_slug`
- 写入 `target_model`
- 对 reasoning 类模型写入 `reasoning_effort` 和 `effort`
- 在 `metadata` 中标记 `model_injector: true`

## UI 层

UI 由 `content.js` 直接创建 DOM 和 style：

- 右下角 `MI` 浮动按钮。
- 控制面板。
- 模型选择器。
- 自定义 model slug 输入框。
- effort 四档选择。
- 状态栏。

当前 UI 是单文件实现，后续建议拆成独立 `ui.js` 或引入构建流程。

## Token 估算

`extension/libs/o200k_base.js` 提供兼容接口：

```js
window.GPTTokenizer_o200k_base = {
  encode,
  countTokens,
  name,
  exact
}
```

当前仓库版本是轻量估算器，保证扩展可运行。若需要更精确估算，应替换为完整 tokenizer bundle。

## 校验与打包

校验入口：

```bash
npm run verify
```

打包入口：

```bash
npm run package
```

GitHub Actions 会在 push / pull request 时执行相同流程。

## 推荐重构方向

长期建议拆分为：

```text
extension/src/
├── index.js
├── config.js
├── network.js
├── models.js
├── state.js
├── tokenizer.js
└── ui.js
```

然后通过构建工具输出单个 `extension/content.js`，保持 Manifest V3 加载简单，同时提升维护性。
