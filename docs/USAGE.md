# 使用指南

本文说明如何安装、配置、使用和排查 ChatGPT Model Injector Pro。

## 1. 环境要求

- Chrome、Edge 或其他 Chromium 内核浏览器。
- 能正常访问 `https://chatgpt.com/` 或 `https://chat.openai.com/`。
- GitHub 仓库中的 `extension/` 目录完整存在。

## 2. 安装方式

1. 下载或克隆本仓库。
2. 打开浏览器扩展管理页：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本项目的 `extension/` 目录。
6. 打开或刷新 ChatGPT 页面。

加载成功后，页面右下角会出现 `MI` 浮动按钮。

## 3. 基础使用

1. 点击 `MI` 浮动按钮打开控制面板。
2. 在“目标模型”中选择预设模型或选择 `Custom / 自定义`。
3. 如果使用自定义模型，在输入框中填写 model slug。
4. 对支持 reasoning 的模型选择 effort：Light、Standard、Extended、Heavy。
5. 点击“启用覆盖”。
6. 刷新或继续使用 ChatGPT。

## 4. 重要限制

- 扩展不会绕过服务器权限。
- 如果账号本身没有模型权限，服务端仍会拒绝或回退。
- 扩展只在浏览器本地修改请求参数，用于调试和自用工作流。
- ChatGPT 前端接口可能变化，若页面结构或后端 endpoint 变化，需要迭代适配。

## 5. Token 估算

当前仓库中 `extension/libs/o200k_base.js` 是轻量兼容层，提供 `countTokens()` 和 `encode()` 接口，适合快速估算上下文规模。

它不是完整官方 tokenizer，因此结果用于趋势判断，不应作为精确计费或严格上下文边界依据。后续可在迭代中替换为完整 tokenizer bundle。

## 6. 开发流程

修改代码后：

```bash
npm run verify
```

打包扩展：

```bash
npm run package
```

生成文件位于 `dist/`。

## 7. 常见问题

### 页面没有出现 MI 按钮

- 确认加载的是 `extension/` 目录，而不是仓库根目录。
- 确认扩展已启用。
- 刷新 ChatGPT 页面。
- 打开 DevTools Console 检查是否有脚本错误。

### 模型没有生效

- 确认控制面板处于启用状态。
- 确认 model slug 拼写正确。
- 确认账号拥有对应模型权限。
- 尝试新建会话后再测试。

### Token 数不准确

当前使用轻量估算器，中文、代码块、多语言混排时可能有误差。建议后续替换为完整 tokenizer。

### GitHub Actions 失败

先本地执行：

```bash
npm run verify
npm run package
```

根据输出修复缺失文件或 manifest 引用错误。
