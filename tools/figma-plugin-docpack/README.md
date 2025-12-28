Figma Plugin Docpack (Local Markdown + Search Index)
====================================================

This tool mirrors the official Figma Plugin API docs into local Markdown and builds a local search index.
Primary use case: give Cursor/agent-mode a local, greppable corpus so it can answer API questions without guessing.

Install
-------

From this directory:
- npm i

Refresh docs (crawl + index)
----------------------------

- npm run doc:refresh

Outputs:
- ./out/md/**.md
- ./out/index.json
- ./out/docs.json

Search
------

- npm run doc:search -- "createImageAsync"
- npm run doc:search -- "layoutMode"
- npm run doc:search -- "loadFontAsync"

Recommended: also install plugin typings in your actual plugin repo
------------------------------------------------------------------

The typings are the authoritative API surface:
- npm i -D @figma/plugin-typings

Then your agent should search BOTH:
- node_modules/@figma/plugin-typings/** (true API surface)
- tools/figma-plugin-docpack/out/md/** (narrative docs)
