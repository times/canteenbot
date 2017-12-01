module.exports = {
  entry: {
    core: './core/handler.js',
    slack: './slack/handler.js',
    alexa: './alexa/handler.js',
    scraper: './scraper/handler.js',
  },
  output: {
    path: './dist',
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      },
    ],
  },
};
