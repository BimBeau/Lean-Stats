const path = require('path');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  module: {
    ...defaultConfig.module,
    rules: [
      ...defaultConfig.module.rules,
      {
        test: /\.geojson$/i,
        type: 'json',
      },
    ],
  },
  entry: {
    admin: path.resolve(__dirname, 'src/admin/index.js'),
    'style-admin': path.resolve(__dirname, 'src/admin/style.css'),
  },
  output: {
    ...defaultConfig.output,
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
};
