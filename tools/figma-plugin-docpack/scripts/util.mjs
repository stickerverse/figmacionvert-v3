import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fetch } from "undici";

export function toSafeSlug(url) {
  const u = new URL(url);
  let p = u.pathname.replace(/\/+$/g, "");
  if (p === "") p = "/";

  const base = p
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "__")
    .replace(/[^\w\-._]+/g, "_");

  const q = u.search ? `__q_${hashShort(u.search)}` : "";
  return `${base || "root"}${q}`.toLowerCase();
}

export function hashShort(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 10);
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fileExists(fp) {
  try {
    await stat(fp);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(fp) {
  const raw = await readFile(fp, "utf8");
  return JSON.parse(raw);
}

export async function writeJson(fp, obj) {
  await ensureDir(path.dirname(fp));
  await writeFile(fp, JSON.stringify(obj, null, 2), "utf8");
}

export function normalizeWhitespace(s) {
  return s.replace(/\s+/g, " ").trim();
}

export async function fetchHtml(url, { userAgent, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          userAgent ||
          "figma-plugin-docpack/1.0 (+local indexing for development)",
        "accept": "text/html,application/xhtml+xml"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    const html = await res.text();
    return html;
  } finally {
    clearTimeout(t);
  }
}

export function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin;
}

export function stripHash(url) {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
}

export function isInScope(url, scopes) {
  return scopes.some((prefix) => url.startsWith(prefix));
}

export function guessTitleFromPath(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "root";
  return parts[parts.length - 1].replace(/-/g, " ");
}
