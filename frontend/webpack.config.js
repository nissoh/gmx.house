const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  mode: "development",
  watch: false,
  context: __dirname, // to automatically find tsconfig.json
  devtool: 'source-map',
  entry: {
    theme: './src/assignThemeSync.ts',
    main: './src/index.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true, // Set to true if you are using fork-ts-checker-webpack-plugin
            projectReferences: true
          }
        }
      }
    ]
  },
  resolve: {
    modules: [
      "node_modules",
      path.resolve(__dirname)
    ],
    extensions: [".ts", '.js'],
    alias: {
      "hash.js": require.resolve('hash.js'),
    }
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    // new CopyPlugin({
    //   patterns: [
    //     { from: "404.html" },
    //     { from: "CNAME" },
    //   ]
    // }),
  ],
  // node: { crypto: true, stream: true },
  devServer: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5555',
      '/ws': {
        target: 'ws://localhost:5555',
        ws: true
      },
    },
    historyApiFallback: true
  },
  output: {
    clean: true,
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  }
}