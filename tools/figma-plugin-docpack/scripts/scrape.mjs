import path from "node:path";
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import pLimit from "p-limit";

import {
  ensureDir,
  fetchHtml,
  isHttpUrl,
  isInScope,
  isSameOrigin,
  normalizeWhitespace,
  stripHash,
  toSafeSlug,
  writeJson,
  sleep
} from "./util.mjs";

const START_URL = "https://developers.figma.com/docs/plugins/api/api-reference/";
const OUT_DIR = path.resolve("out");
const OUT_MD = path.join(OUT_DIR, "md");
const OUT_META = path.join(OUT_DIR, "crawl-meta.json");

const SCOPES = [
  "https://developers.figma.com/docs/plugins/api/"
];

const CONCURRENCY = 4;
const MIN_DELAY_MS = 150;

function extractMainContent($) {
  const main = $("main");
  if (main.length) return main.first();

  const candidates = [
    "[data-testid='content']",
    ".content",
    "article"
  ];
  for (const sel of candidates) {
    const el = $(sel);
    if (el.length) return el.first();
  }
  return $("body");
}

function extractTitle($, url) {
  const t =
    $("meta[property='og:title']").attr("content") ||
    $("title").text() ||
    url;
  return normalizeWhitespace(t);
}

function collectLinks($, pageUrl) {
  const base = new URL(pageUrl);
  const links = new Set();

  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;

    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

    let abs;
    try {
      abs = new URL(href, base).toString();
    } catch {
      return;
    }

    if (!isHttpUrl(abs)) return;
    if (!isSameOrigin(abs, base.toString())) return;

    const cleaned = stripHash(abs);
    if (isInScope(cleaned, SCOPES)) links.add(cleaned);
  });

  return [...links];
}

function htmlToMarkdown(html, pageUrl) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced"
  });

  turndown.addRule("pre", {
    filter: (node) => node.nodeName === "PRE",
    replacement: (content, node) => {
      const code = node.textContent || "";
      return `\n\n\`\`\`\n${code.replace(/\n+$/g, "")}\n\`\`\`\n\n`;
    }
  });

  turndown.keep(["table", "thead", "tbody", "tr", "th", "td"]);

  const md = turndown.turndown(html);
  const frontmatter =
`---
source: ${pageUrl}
scraped_at: ${new Date().toISOString()}
---

`;
  return frontmatter + md.trim() + "\n";
}

async function writeMarkdown({ url, title, md }) {
  await ensureDir(OUT_MD);
  const slug = toSafeSlug(url);
  const fp = path.join(OUT_MD, `${slug}.md`);
  await writeFile(fp, `# ${title}\n\n${md.replace(/^# .+\n+/m, "")}`, "utf8");
  return fp;
}

async function run() {
  await ensureDir(OUT_DIR);
  await ensureDir(OUT_MD);

  const queue = [START_URL];
  const seen = new Set();
  const pages = [];

  const limit = pLimit(CONCURRENCY);

  async function processUrl(url) {
    if (seen.has(url)) return;
    seen.add(url);

    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = extractTitle($, url);

    const main = extractMainContent($).clone();
    main.find("nav").remove();
    main.find("aside").remove();
    main.find("footer").remove();
    main.find("header").remove();

    const contentHtml = main.html() || "";
    const md = htmlToMarkdown(contentHtml, url);
    const filePath = await writeMarkdown({ url, title, md });

    const links = collectLinks($, url);

    pages.push({ url, title, filePath, linksCount: links.length });

    for (const l of links) {
      if (!seen.has(l)) queue.push(l);
    }

    await sleep(MIN_DELAY_MS);
  }

  while (queue.length) {
    const batch = [];
    while (queue.length && batch.length < CONCURRENCY * 3) {
      const u = queue.shift();
      if (!u || seen.has(u)) continue;
      batch.push(u);
    }
    if (!batch.length) continue;

    await Promise.all(batch.map((u) => limit(() => processUrl(u))));
  }

  const meta = {
    startUrl: START_URL,
    scopes: SCOPES,
    totalPages: pages.length,
    generatedAt: new Date().toISOString(),
    pages
  };

  await writeJson(OUT_META, meta);
  console.log(`Done. Scraped ${pages.length} pages into ${OUT_MD}`);
  console.log(`Meta: ${OUT_META}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
