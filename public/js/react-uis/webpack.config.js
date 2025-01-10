const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");

module.exports = (env, argv) => {
  const plugins = [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(argv.mode || "production"),
    }),
    new LodashModuleReplacementPlugin(),
  ];
  if (argv.analyze) plugins.push(new BundleAnalyzerPlugin());

  return {
    mode: argv.mode || "production",
    entry: {
      tacacs: "./tacacs-ui/src/index.js",
      tacacs_sessions: "./tacacs_sessions-ui/src/index.js",
      radius_sessions: "./radius_sessions-ui/src/index.js",
      logs: "./logs-ui/src/index.js",
      jobs: "./jobs-ui/src/index.js",
      cleanup: "./cleanup-ui/src/index.js",
      servers: "./servers-ui/src/index.js",
      api_settings: "./api_settings-ui/src/index.js",
      api_generate: "./api_generate-ui/src/index.js",
      scheduler: "./scheduler-ui/src/index.js",
      scep: "./scep-ui/index.js",
      header: "./header-ui/index.js",
      protoSelect: "./proto-select-ui/index.js",
      "for-formik": "./for-formik/index.js",
      // manipulate: "./manipulate-react/src/index.js",
      // anc_pxgrid: "./manipulate-react/src/anc_pxgrid.js"
    },
    output: {
      filename: "[name].js",
      path: `${path.resolve(__dirname)}/dist`,
      publicPath: "/js/react-uis/dist/",
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          /* additional options here */
        }),
      ],
    },
    resolve: {
      alias: {
        formik: path.resolve(__dirname, "node_modules/formik/dist/index.js"),
        "react-async": path.resolve(__dirname, "node_modules/react-async/"),
        "prop-types": path.resolve(__dirname, "node_modules/prop-types/"),
        lodash: path.resolve(__dirname, "node_modules/lodash/"),
        "react-cui-2.0": path.resolve(
          __dirname,
          "node_modules/react-cui-2.0/build/"
        ),
        "my-react-cui": path.resolve(
          __dirname,
          "../pxgrid-ui/src/components/cui"
        ),
        "my-composed": path.resolve(
          __dirname,
          "../common-react-components/my-composed/"
        ),
      },
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
    plugins,
    externals: {
      react: "React",
      "react-dom": "ReactDOM",
      "react-is": "ReactIs",
      "react-router-dom": "ReactRouterDOM",
      "react-json-tree": "ReactJsonTree",
      "react-modal": "ReactModal",
      "react-sortable-hoc": "SortableHOC",
      "prop-types": "PropTypes",
      "react-cui-2.0": "ReactCUI",
      axios: "axios",
      formik: "formik",
      luxon: "luxon",
      animejs: "anime",
      lodash: {
        commonjs: "lodash",
        commonjs2: "lodash",
        amd: "lodash",
        root: "_",
      },
    },
  };
};
