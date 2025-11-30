const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'cheap-module-source-map',
  entry: {
    background: './src/background.ts',
    'content-scripts/capture-dom': './src/content-scripts/capture-dom.ts',
    'content-script': './src/content-script.ts',
    'injected-script': './src/injected-script.ts',
    'popup/popup': './src/popup/popup-new.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content) {
            // When building into dist, strip the "dist/" prefix so the copied manifest
            // references files relative to the dist folder.
            const manifest = JSON.parse(content.toString());
            const normalized = JSON.parse(JSON.stringify(manifest).replace(/dist\\//g, ''));
            return JSON.stringify(normalized, null, 2);
          }
        },
        { from: 'icons', to: 'icons' },
        { from: 'src/popup/popup-new.html', to: 'popup/popup.html' },
        { 
          from: 'src/popup/popup-new.css', 
          to: 'popup/popup.css',
          toType: 'file'
        }
      ]
    })
  ]
};
