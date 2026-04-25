# ChatGPT Model Injector Pro

ChatGPT Model Injector Pro is a browser extension that injects model selection controls into ChatGPT and adds context-token tracking, effort selection, and API-discovered model support.

## Project Structure

- `extension/manifest.json`: extension manifest for Chromium-based browsers
- `extension/content.js`: main injected logic and UI behavior
- `extension/config.js`: runtime configuration entry
- `extension/libs/o200k_base.js`: tokenizer dependency used for context counting
- `extension/icons/`: extension icons and icon source assets
- `extension/ui-samples/`: static UI samples for layout review
- `docs/usage-guide.md`: setup and usage guide
- `docs/iteration-plan.md`: recommended optimization roadmap

## Features

- Injects a model switcher into ChatGPT pages
- Supports preset and discovered model IDs
- Tracks context usage with tokenizer-based counting
- Supports effort presets for reasoning-capable models
- Includes configurable sponsor and account-info options

## Installation

1. Open your Chromium-based browser extensions page.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select the `extension/` folder in this repository.

## Notes

- The extension targets `https://chatgpt.com/*` and `https://chat.openai.com/*`.
- The repository has been cleaned before import. Temporary patches, local `.git` metadata, and generated screenshot outputs from the source archive were excluded.

## Current Limitations

- The main logic is concentrated in one large content script, which makes maintenance harder.
- There is no formal package/build/test workflow yet.
- Sample UI files are preserved as references, but they are not integrated into an automated preview pipeline.
