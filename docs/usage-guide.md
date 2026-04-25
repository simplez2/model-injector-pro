# Usage Guide

## Requirements

- A Chromium-based browser such as Chrome or Edge
- Access to ChatGPT web pages

## Install the Extension

1. Download or clone this repository locally.
2. Open the browser extensions page.
3. Turn on developer mode.
4. Load the `extension/` folder as an unpacked extension.

## Basic Usage

1. Open ChatGPT in the browser.
2. Wait for the injected control UI to appear.
3. Choose a model from the extension menu.
4. Optionally enable effort settings for supported models.
5. Review the context-token display while chatting.

## Main Files

- `extension/content.js`: UI rendering, model interception, local state, and token counting
- `extension/config.js`: sponsor and advanced settings
- `extension/manifest.json`: browser extension permissions and script registration

## Troubleshooting

- If the UI does not appear, refresh the ChatGPT page after loading the extension.
- If the model list looks outdated, re-open ChatGPT and let the extension capture fresh model data.
- If token counting is slow on large chats, reduce page complexity or start a fresh conversation.
- If browser policies block the extension, verify developer mode is enabled and the extension folder was loaded correctly.

## Suggested Development Workflow

1. Edit `extension/content.js` and `extension/config.js`.
2. Reload the unpacked extension from the browser extensions page.
3. Refresh ChatGPT and validate behavior.
4. Use the files under `extension/ui-samples/` for quick UI reference checks.
