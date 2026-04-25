# Icons

`icon-source.svg` is the editable source icon for this extension.

Generate PNG icons locally with:

```powershell
cd extension/icons
./generate-icons.ps1
```

The current GitHub connector accepted text/source files but blocked one of the PNG binary blob uploads during this batch operation. The extension manifest therefore does not require PNG icons yet, so the extension can still be loaded from `extension/` without broken icon references.

After generating PNG files locally, you can commit them normally:

```bash
git add extension/icons/icon-16.png extension/icons/icon-32.png extension/icons/icon-48.png extension/icons/icon-128.png
git commit -m "chore: add generated extension icons"
git push origin main
```
