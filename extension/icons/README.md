# Icon assets

The extension uses an original **Orbital Lens** mark: one deliberately open orbit,
one vertical optical lens, and one central light point. Its geometry is intentionally
separate from the OpenAI/ChatGPT interlocking knot and does not reuse their logotype.

- `floating-icon.svg` is the monochrome launcher source. Its `#orbit` and `#core`
  groups are independent so the UI can rotate them in opposite directions.
- `icon-source.svg` is the 256 px editable application-icon source.
- `generate-icons.ps1` recreates the 16, 32, 48, and 128 px manifest PNGs plus
  `icon-preview.png` using only Windows `System.Drawing`.

Generate the raster assets from the repository root:

```powershell
./extension/icons/generate-icons.ps1
```

Keep the launcher geometry in `content.js` aligned with `floating-icon.svg` when the
inline SVG changes. The intended open state rotates the orbit roughly `42deg` and
counter-rotates the core roughly `-42deg`; the source itself contains no animation.
