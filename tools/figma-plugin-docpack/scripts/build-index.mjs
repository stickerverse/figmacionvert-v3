import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import lunr from "lunr";

import { ensureDir, writeJson, normalizeWhitespace } from "./util.mjs";

const OUT_DIR = path.resolve("out");
const OUT_MD = path.join(OUT_DIR, "md");
const OUT_INDEX = path.join(OUT_DIR, "index.json");
const OUT_DOCS = path.join(OUT_DIR, "docs.json");

function extractHeadings(markdown) {
  const headings = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (m) headings.push(normalizeWhitespace(m[2]));
  }
  return headings;
}

function stripFrontmatter(md) {
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) {
      return md.slice(end + "\n---".length).trim();
    }
  }
  return md.trim();
}

async function run() {
  await ensureDir(OUT_DIR);

  const files = (await readdir(OUT_MD)).filter((f) => f.endsWith(".md"));
  const docs = [];

  for (const f of files) {
    const fp = path.join(OUT_MD, f);
    const raw = await readFile(fp, "utf8");
    const md = stripFrontmatter(raw);

    const titleMatch = /^#\s+(.+)$/m.exec(md);
    const title = titleMatch ? normalizeWhitespace(titleMatch[1]) : f;

    const headings = extractHeadings(md);
    const body = md.replace(/^#\s+.+$/m, "").trim();

    docs.push({
      id: f,
      title,
      headings,
      body,
      path: fp
    });
  }

  const idx = lunr(function () {
    this.ref("id");
    this.field("title");
    this.field("headings");
    this.field("body");

    for (const d of docs) {
      this.add({
        id: d.id,
        title: d.title,
        headings: d.headings.join(" "),
        body: d.body
      });
    }
  });

  await writeJson(OUT_INDEX, idx);
  await writeJson(OUT_DOCS, docs);

  console.log(`Built index for ${docs.length} docs.`);
  console.log(`Index: ${OUT_INDEX}`);
  console.log(`Docs:  ${OUT_DOCS}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
