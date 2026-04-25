# 迭代优化文档

本文记录 ChatGPT Model Injector Pro 的当前状态、风险点和建议迭代路线。

## 当前版本目标

当前版本优先完成三件事：

1. 将原始压缩包整理为可维护的私有 GitHub 仓库。
2. 补齐可运行的 Manifest V3 扩展源码、说明文档和校验脚本。
3. 移除本地临时文件、损坏恢复文件、测试输出和不适合入库的 `.git` 元数据。

## 已完成

- 创建并使用私有仓库：`simplez2/chatgpt-model-injector-pro`。
- 补齐扩展主目录：`extension/`。
- 补齐主脚本：`extension/content.js`。
- 补齐配置入口：`extension/config.js`。
- 补齐 tokenizer 兼容层：`extension/libs/o200k_base.js`。
- 补齐项目脚本：`scripts/verify_extension.py`、`scripts/package_extension.py`。
- 补齐 GitHub Actions：`.github/workflows/verify.yml`。
- 补齐文档：README、使用指南、架构说明、迭代计划。

## 当前技术状态

### 网络拦截

当前主脚本在页面 main world 中 patch `fetch` 和 `XMLHttpRequest`：

- 捕获 `/backend-api/models` 响应并归一化模型列表。
- 对对话相关请求进行 JSON body patch。
- 在启用状态下写入 `model`、`model_slug`、`target_model`。
- 对推理类模型写入 `reasoning_effort` / `effort`。

### UI

当前 UI 是单文件注入式浮动面板：

- `MI` 浮动按钮。
- 模型下拉框。
- 自定义 model slug 输入框。
- effort 四档按钮。
- 启用/暂停、刷新模型、调试日志、重置按钮。
- 上下文 token 估算状态栏。

### Token 估算

当前仓库中 `extension/libs/o200k_base.js` 是轻量兼容层，不是完整 tokenizer bundle。它保留 `window.GPTTokenizer_o200k_base.encode()` 和 `countTokens()` 接口，保证扩展可以运行并提供上下文规模估算。

如需更精确估算，后续应替换为完整 tokenizer 资源或构建期生成的精简资源。

## 风险与限制

1. ChatGPT 网页和内部接口可能变化，扩展需要持续适配。
2. 请求参数覆盖不能绕过服务端权限。
3. 当前主脚本仍偏集中，长期维护建议拆分模块。
4. 当前 tokenizer 是估算器，精度低于完整 tokenizer。
5. 当前仓库暂未补齐原始 PNG 图标二进制资源；manifest 已避免引用缺失 PNG。

## 建议路线图

### 阶段 1：稳定性

- 增加 payload patch 单元测试。
- 增加模型列表归一化测试。
- 增加 DOM UI 初始化测试。
- 检查不同 ChatGPT 页面状态下是否重复注入 UI。

### 阶段 2：模块化

建议拆分为：

```text
extension/src/
├── network.js        # fetch / XHR patch
├── models.js         # 模型发现和归一化
├── state.js          # localStorage / chrome.storage 封装
├── tokenizer.js      # token 估算适配
├── ui.js             # 面板渲染
└── index.js          # 入口
```

后续可引入 esbuild 或 rollup，将 `src/` 构建为一个 `content.js`。

### 阶段 3：资源补齐

- 使用正式 SVG 源生成 `16/32/48/128` PNG 图标。
- 将 manifest 恢复为带 icons 字段的版本。
- 补齐文档截图素材。
- 若需要，替换为完整 `o200k_base` tokenizer bundle。

### 阶段 4：发布自动化

- GitHub Actions 自动运行 `npm run verify`。
- 自动生成 `dist/chatgpt-model-injector-pro-v*.zip`。
- 打 tag 时自动生成 GitHub Release。

## 提交规范建议

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `chore:` 工程维护
- `refactor:` 重构
- `test:` 测试

示例：

```bash
git commit -m "feat: add model discovery cache"
git commit -m "docs: expand installation troubleshooting"
```
