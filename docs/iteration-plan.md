# Iteration Plan

## Short-Term Improvements

- Split `extension/content.js` into smaller modules such as storage, DOM hooks, model registry, and token counting.
- Add a clear `.gitignore` and basic repository hygiene rules for generated files and local scratch artifacts.
- Move hard-coded model metadata into a dedicated configuration file to reduce maintenance cost.
- Add smoke-test scripts for core model switching and UI rendering behavior.

## Next Iteration

- Introduce a lightweight build or lint workflow so the extension code can be checked before release.
- Add explicit error handling and fallback UI for failed model/account requests.
- Formalize localization strings instead of keeping labels inline inside the main script.
- Convert UI samples into a repeatable preview or regression-check flow.

## Long-Term Direction

- Build a small internal architecture around services and view components instead of a single large content script.
- Add automated browser validation for critical user paths.
- Create release packaging and versioning workflow for extension distribution.
- Document compatibility expectations for future ChatGPT page changes.

## Risk Notes

- The project depends on ChatGPT page structure and backend request behavior, so upstream changes may break functionality suddenly.
- Refactoring should be done in small steps because the current script mixes interception, rendering, persistence, and analytics concerns.
