const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const EXT_ROOT = __dirname;

module.exports = {
  mode: "production",

  // Keep source maps in prod builds for actionable stack traces.
  devtool: "cheap-module-source-map",

  // Fail fast: if something is wrong, do not emit partial bundles.
  bail: true,

  // Determinism: avoid any hidden caching while you are chasing intermittent ts-loader behavior.
  // If you want caching later, gate it behind an env var (see note below).
  cache: false,

  context: EXT_ROOT,

  entry: {
    background: "./src/background.ts",
    "content-script": "./src/content-script.ts",
    "injected-script": "./src/injected-script.ts",
    "popup/popup": "./src/popup/popup-new.ts",
  },

  output: {
    path: path.resolve(EXT_ROOT, "dist"),
    filename: "[name].js",
    publicPath: "",
    clean: false, // we control cleaning explicitly via scripts
  },

  resolve: {
    extensions: [".ts", ".js", ".tsx", ".jsx"],
    // Force resolution to prefer this package's node_modules first (reduces hoist weirdness).
    modules: [path.resolve(EXT_ROOT, "node_modules"), "node_modules"],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              // Critical: ensure webpack uses the same tsconfig you ran with `npx tsc --noEmit`.
              configFile: path.resolve(EXT_ROOT, "tsconfig.json"),

              // Reduce the compiled surface area to webpack entry graph.
              // Prevents ts-loader from “helpfully” pulling in extra files.
              onlyCompileBundledFiles: true,

              // Ensure typechecking happens here (matches typical expectations when diagnosing).
              transpileOnly: false,

              // In intermittent cases, stale file caching can bite.
              // Explicitly disable if you suspect caching artifacts.
              experimentalFileCaching: false,
            },
          },
        ],
      },
    ],
  },

  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },

  stats: "errors-warnings",
  infrastructureLogging: { level: "warn" },

  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "manifest.json",
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content.toString());
            const normalized = JSON.parse(
              JSON.stringify(manifest).replace(/dist\//g, "")
            );
            return JSON.stringify(normalized, null, 2);
          },
        },
        { from: "icons", to: "icons" },
        { from: "src/popup/popup-new.html", to: "popup/popup.html" },
        {
          from: "src/popup/popup-new.css",
          to: "popup/popup.css",
          toType: "file",
        },
      ],
    }),
  ],
};
