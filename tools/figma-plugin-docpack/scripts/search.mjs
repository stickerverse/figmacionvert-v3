import path from "node:path";
import { readFile } from "node:fs/promises";
import lunr from "lunr";

import { readJson, normalizeWhitespace } from "./util.mjs";

const OUT_DIR = path.resolve("out");
const OUT_INDEX = path.join(OUT_DIR, "index.json");
const OUT_DOCS = path.join(OUT_DIR, "docs.json");

function usage() {
  console.log("Usage:");
  console.log('  npm run doc:search -- "createImageAsync"');
  console.log('  npm run doc:search -- "layoutMode"');
  process.exit(1);
}

function makeSnippet(body, query) {
  const q = query.toLowerCase();
  const text = normalizeWhitespace(body);
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.slice(0, 240) + (text.length > 240 ? "…" : "");
  const start = Math.max(0, idx - 90);
  const end = Math.min(text.length, idx + 160);
  const snippet = text.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}

async function run() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) usage();

  const idxRaw = await readFile(OUT_INDEX, "utf8");
  const idx = lunr.Index.load(JSON.parse(idxRaw));
  const docs = await readJson(OUT_DOCS);

  const results = idx.search(query).slice(0, 8);

  if (!results.length) {
    console.log(`No matches for: ${query}`);
    process.exit(0);
  }

  console.log(`Top matches for: ${query}\n`);

  for (const r of results) {
    const d = docs.find((x) => x.id === r.ref);
    if (!d) continue;

    const snippet = makeSnippet(d.body, query);
    console.log(`- ${d.title}`);
    console.log(`  score: ${r.score.toFixed(4)}`);
    console.log(`  file:  ${d.path}`);
    console.log(`  note:  ${snippet}\n`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
