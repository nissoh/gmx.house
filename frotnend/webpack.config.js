const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

module.exports = {
  mode: "development",
  entry: {
    theme: './src/applyTheme.ts',
    main: './src/index.ts',
  },
  watch: false,
  context: __dirname, // to automatically find tsconfig.json
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            "transpileOnly": true, // Set to true if you are using fork-ts-checker-webpack-plugin
            "projectReferences": true
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
    })
  ],
  // node: { crypto: true, stream: true },
  devServer: {
    port: 3000,
    historyApiFallback: true
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, '.dist')
  }
}