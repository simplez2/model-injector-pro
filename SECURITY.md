# Security Policy

## Supported versions

Security fixes are developed for the latest public release and the current `main` branch. Older unpacked copies may depend on page behavior that has already changed and are not supported.

| Version | Supported |
| --- | --- |
| 1.3.x | Yes |
| Earlier versions | No |

## Report a vulnerability

Please use GitHub's private vulnerability reporting or a private Security Advisory for this repository. Do not open a public Issue for an unpatched vulnerability and do not paste live account data into any report.

Include only the minimum information needed to reproduce the issue:

- Affected extension version and commit, browser version, and operating system.
- The relevant code path and a minimal proof of concept.
- Expected impact and the conditions required to trigger it.
- Redacted console output or diagnostics when necessary.

Remove cookies, Authorization headers, API keys, session identifiers, account or workspace identifiers, conversation text, personal file paths, and private URLs before submission. Use test data whenever possible.

Maintainers will assess the report, coordinate a fix where feasible, and credit the reporter if requested. Please allow reasonable time for remediation before public disclosure.

## Security model

Model Injector Pro runs in the target page's `MAIN` world so it can interoperate with page network calls. Consequently:

- It is not a secret-storage boundary from same-origin page JavaScript.
- A compromised target page can observe page-visible state and behavior.
- Changes to undocumented page endpoints can break assumptions without notice.
- Client-side request changes cannot bypass server-side authorization.

The project has no developer-controlled backend or telemetry service. The release ZIP is produced from a strict runtime allowlist, and CI checks for high-confidence secret patterns, local artifacts, legacy brand paths, and dependency hash drift.

## Out of scope

- Vulnerabilities in the target website, Chromium, or unrelated extensions.
- Reports that only show a model slug being rejected, ignored, or unavailable.
- Social engineering, phishing, denial of service, or testing against accounts without authorization.
- Findings that require publishing real credentials or private conversation data.

If a report concerns the target website rather than this extension, use that provider's own security reporting process.
