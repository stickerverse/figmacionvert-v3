const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'cheap-module-source-map', // Avoid eval() for Manifest V3 CSP compliance
  entry: {
    background: './src/background.ts',
    'content-script': './src/content-script.ts',
    'injected-script': './src/injected-script.ts',
    'popup/popup-simple': './src/popup/popup-simple.ts',
    'popup/popup-new': './src/popup/popup-new.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icons', to: 'icons' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/popup/popup-new.html', to: 'popup/popup-new.html' },
        { from: 'src/popup/popup-new.css', to: 'popup/popup-new.css' }
      ]
    })
  ]
};
