const path = require('path');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaultConfig,
  entry: {
    admin: path.resolve(__dirname, 'src/admin/index.js'),
  },
  output: {
    ...defaultConfig.output,
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
};
