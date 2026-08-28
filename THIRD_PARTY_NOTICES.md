# Third-party notices

This project uses third-party software and icon geometry. The MIT License in the repository root applies to Open Creative Wall source code and documentation; it does not replace the licenses below.

Versions are locked by `package-lock.json` and `scripts/requirements-avatar.txt`. A dependency update must update this notice when its license or attribution changes.

## JavaScript runtime dependencies

| Package | Version | License | Project |
| --- | ---: | --- | --- |
| React | 19.2.0 | MIT | <https://github.com/facebook/react> |
| React DOM | 19.2.0 | MIT | <https://github.com/facebook/react> |
| OGL | 1.0.11 | Unlicense | <https://github.com/oframe/ogl> |

## JavaScript development dependencies

| Package | Version | License | Project |
| --- | ---: | --- | --- |
| Vite | 6.4.3 | MIT | <https://github.com/vitejs/vite> |
| @vitejs/plugin-react | 5.0.4 | MIT | <https://github.com/vitejs/vite-plugin-react> |
| lucide-static | 1.33.0 | ISC, with MIT notice for Feather-derived icons | <https://github.com/lucide-icons/lucide> |
| TypeScript | 6.0.3 | Apache-2.0 | <https://github.com/microsoft/TypeScript> |
| @types/react | 19.2.17 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/react-dom | 19.2.3 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |

Transitive JavaScript packages and their integrity hashes are recorded in `package-lock.json`. Their license files are supplied by their respective packages during `npm ci`.

## Avatar-generation dependencies

| Package | Version | License | Project |
| --- | ---: | --- | --- |
| Pillow | 12.3.0 | MIT-CMU | <https://github.com/python-pillow/Pillow> |
| VTracer | 0.6.15 | MIT | <https://github.com/visioncortex/vtracer> |

These packages are optional build-time tools. They are only installed through uv when the avatar generator is run.

## Background music

“Calm Track” by pmiller is distributed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Source: <https://opengameart.org/content/calm-track>.

Attribution is not required by CC0, but this notice is retained as a voluntary credit. The bundled copy was transcoded from the author's loopable Ogg Vorbis file to MP3, reduced by 1.5 dB and stripped of metadata for web delivery. The exact source and shipped hashes are recorded in `ASSET-PROVENANCE.md`.

## Lucide icons

The neutral pattern texture, memory symbol and favicon are generated from the Lucide icon set supplied by `lucide-static`. Source icon names are pinned in `scripts/generate-demo-textures.mjs`; the package version, license hash and output hashes are recorded in `scripts/demo-textures.manifest.json`. The following notices are retained from `lucide-static` 1.33.0.

### ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Some Lucide icons are derived from the Feather project and carry this additional notice:

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
