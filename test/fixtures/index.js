module.exports = {
  build: require('./build'),
  manifest: require('./manifest'),
  manifestJson: require('./manifest.json'),
  packageJson: require('./package.json'),
  dir: __dirname,
  extOneDir: __dirname + '/voltron-test',
  extTwoDir: __dirname + '/voltron-test2'
};
