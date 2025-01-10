const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/ui-app.js",
  output: {
    path: path.resolve(__dirname),
    filename: "pxgrid.bundle.js",
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        /* additional options here */
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/env",
                {
                  // "useBuiltIns": "entry"
                  targets: {
                    node: "current",
                    chrome: "58",
                    firefox: "53",
                  },
                },
              ],
              "@babel/preset-react",
            ],
            plugins: ["@babel/plugin-proposal-class-properties"],
          },
        },
      },
      {
        test: /[.]pug$/,
        use: {
          loader: "pug-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": '"production"',
    }),
  ],
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    "react-router-dom": "ReactRouterDOM",
    "react-modal": "ReactModal",
    "react-json-tree": "ReactJsonTree",
    "react-cui-2.0": "ReactCUI",
  },
};
