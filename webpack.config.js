module.exports = {
  entry: {
    core: './core/handler.js',
    slack: './slack/handler.js',
    'slack-notifier': './slack-notifier/handler.js',
    alexa: './alexa/handler.js',
  },
  output: {
    path: './dist',
    filename: '[name].js',
    libraryTarget: "commonjs",
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: [ 'es2015' ]
        }
      }
    ]
  },
}
