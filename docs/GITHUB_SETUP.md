# GitHub 仓库设置说明

本仓库用于保存 ChatGPT Model Injector Pro 的私有源码和文档。

## 仓库信息

- Owner：`simplez2`
- Repository：`chatgpt-model-injector-pro`
- Visibility：Private
- Default branch：`main`

## 本地克隆

```bash
git clone https://github.com/simplez2/chatgpt-model-injector-pro.git
cd chatgpt-model-injector-pro
```

## 推荐首次检查

```bash
npm run verify
npm run package
```

## 手动加载扩展

1. 打开 `chrome://extensions/` 或 `edge://extensions/`。
2. 开启开发者模式。
3. 选择“加载已解压的扩展程序”。
4. 选择仓库中的 `extension/` 目录。

## 后续推送

```bash
git add .
git commit -m "chore: update extension source"
git push origin main
```

## 发布建议

后续可以添加 release workflow，在打 tag 时自动运行：

```bash
npm run verify
npm run package
```

并把 `dist/chatgpt-model-injector-pro-v*.zip` 上传为 Release Asset。

## 安全建议

- 不要提交浏览器 profile、Cookie、token、账号导出数据。
- 不要提交本地 `.git` 历史压缩包。
- 如果补回完整 tokenizer 或 PNG 资源，建议通过正常 git push 或 GitHub Desktop 上传，以避免网页/API 对二进制大文件的限制。
