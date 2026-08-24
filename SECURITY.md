# Security policy

## Supported versions

Security fixes target the current `main` branch and the latest `0.1.x` release. Older snapshots should be upgraded rather than patched independently.

| Version | Supported |
| --- | --- |
| Latest `0.1.x` | Yes |
| Current `main` | Yes |
| Older snapshots | No |

## Report privately

Do not open a public issue for:

- credentials, tokens or private endpoints;
- real-person or employee data accidentally entering the repository;
- a way to expose local files through the development or preview server;
- malicious SVG, media, dependency or build-pipeline behavior;
- a vulnerability that could affect users of a published build.

Use GitHub's [private vulnerability-reporting form](https://github.com/xchangee/growth-share/security/advisories/new). Do not include the report in a public issue or discussion. If that form is unavailable, contact a maintainer privately and share only enough detail to establish a secure reporting path.

Include affected version or commit, environment, reproduction steps, impact, proof of concept where safe, and any known mitigation. Do not include real personal data; redact it or describe the shape of the issue.

Maintainers will acknowledge the report when received, validate impact, coordinate a fix and credit the reporter if requested and safe. No disclosure deadline or bounty is promised. Please allow a fix to be prepared before public disclosure.

## Dependency and build hygiene

The project locks JavaScript and Python build dependencies. Maintainers should run `npm run audit` and `npm run verify` before a release, review lockfile-only updates, and rebuild generated assets only from documented sources. Built output, generated SVGs and media must be checked for unexpected external URLs, scripts, embedded images and source maps.

The application is a static client and does not require credentials. Do not add secrets to client-side environment variables: any value included by Vite can become public in the browser bundle.
