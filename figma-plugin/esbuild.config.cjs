/* eslint-disable no-console */
const path = require("path");
const esbuild = require("esbuild");

const PLUGIN_ROOT = __dirname;

const isWatch = process.argv.includes("--watch");
const isProd = process.env.NODE_ENV === "production" || !isWatch;

async function main() {
  const ctx = await esbuild.context({
    absWorkingDir: PLUGIN_ROOT,

    entryPoints: [path.resolve(PLUGIN_ROOT, "src/code.ts")],
    outfile: path.resolve(PLUGIN_ROOT, "dist/code.js"),

    bundle: true,
    format: "cjs",
    platform: "node",
    target: ["es6"],

    // Critical: force esbuild to use the same TS project context as `tsc -p tsconfig.json`
    tsconfig: path.resolve(PLUGIN_ROOT, "tsconfig.json"),

    loader: {
      ".html": "text"
    },

    // Keep externals explicit and stable.
    external: ["worker_threads", "child_process", "fs", "path"],

    sourcemap: true,
    minify: isProd,
    logLevel: "info",
    legalComments: "none",

    define: {
      "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development")
    }
  });

  if (isWatch) {
    await ctx.watch();
    console.log("[figma-plugin] esbuild watch enabled");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("[figma-plugin] esbuild build complete");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
