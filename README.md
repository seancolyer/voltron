#Voltron: Defender of Modular Extensions

##What is Voltron?
Voltron is a library for use while building a browser extension to allow for making individual extensions that can be combined into one extension.

##Why?
If you have an extension that runs on its own, but is deployed together with other extensions, you'll want a way to combine them all with the minimal amount of configuration

##How?
###Conventions
Voltron uses mostly convention over configuration. The only configuration is related to the same things you'd need to get the individual child extensionrunning.

Voltron discovers your child extensions, which we'll call voltron extensions, through the convention of looking through your dependencies for anything that matches `voltron-`.

Voltron supports the following build conventions:
* A `**/voltron.js` file placed anywhere that tells Voltron how to build your extension
* A `**/voltron/` folder placed anywhere within the project with either an `index.js` or `build.js`

Voltron supports the following manifest conventions:
* A `**/manifest.js` file placed anywhere that Voltron will merge into the parent extension
* A `**/manifest.json` file placed anywhere that Voltron will merge into the parent extension

###Package.json
Declare your child extensions as dependencies to your parent/host extension and Voltron will discover it.
```json
{
    "dependencies": {
        "voltron-child-extension": "^1.0.0",
    }
}
```

###Build File
Your build file is a module that exports a `function` that will receive the build options, which should always include an output directory for where it should build, and returns a `Promise`. The `Promise` is for coordinating other build steps that may need to wait on the child extension's build to complete. If you don't leverage the output directory Voltron won't provide you with as much value as you'll need to manually copy/move the output of a child extension. In the future, we could add in another convention to automate this process as well.

```js
module.exports = function(buildOptions) {
    return new Promise((resolve, reject) => {
        // do build stuff
        
        // build is now complete
        resolve(/*whatever*/);
    });
}
```

###Manifest File
Your manifest file can either be a JSON file or a js file that exports an object that has all the fields you want to merge into the parent manifest. Voltron will intelligently avoid certain keys that should not be merged and will add those that should be.

###Main Extension
Use Voltron during your build process to combine all extensions into one extension. There is only a single function directly exposed and should handle everything you need.

```js
const voltron = require('voltron');
const voltronPromise = voltron({
  cwd: 'path', // Optional, defaults to process.cwd()
  manifest: 'path to manifest.json', // Required
  include: [], // Optional
  exclude: [], // Optional
  buildOpts: { // This is your own convention object to use how you see fit 
    outputDir: path.resolve(__dirname, '../../../build/chrome/'), // Required
    env: 'some env' // Recommended
  }
});
```

| Property  | Description                                                                                                                                                                                                                                      |
| ------    | -------                                                                                                                                                                                                                                          |
| manifest  | The manifest to use as the base object to merge voltron extension manifests into. Think of it as Object.assign({}, manifest, voltronExtension1, voltronExtension2)                                                                               |
| cwd       | Volron will default to start searching for voltron extensions in the `process.cwd` using a glob implementation. You can optimize this by passing it the `node_modules` to start searching from, which will speed up Voltron for a large codebase |
| include   | Voltron extensions that you specifically want to include, which acts as a whitelist (independent of exclude), only need partial name ie test for voltron-test |
| exclude | Voltron extensions that you specifically want to exclude, which acts as a blacklist (independent of include, but wins if an extension exists in both)   |
| buildOpts | Your own free to use object that'll be passed into all voltron extensions build functions |

`buildOpts` will be passed to your build script. An `outputDir` is required otherwise voltron loses value without your build supporting a dynamic output path. The function returns a promise that eventually resolves with the combined manifest to use with the rest of your build process.

##Putting it all together
We'll be modifying a fake extension called VapeNation to support Voltron. In VapeNation we have a directory structure that looks like this

```
vapenation
├── flyfile.js
├── package.json
├── scripts
│   ├── config
│   ├── fly
│   │   ├── copy.js
│   │   └── webpack.js
│   └── voltron
│       └── build.js
├── src
│   ├── _manifests
│   │   ├── chrome
│   │   │   └── manifest.json
│   │   ├── firefox
│   │   └── readme.md
│   ├── assets
│   │   ├── icons
│   │   └── images
│   ├── index.js
└── webpack.config.js
```

###Create a build file
We can put our build file underneath a directory named `voltron` named as either `index.js` or `build.js`. The alternative is to create a build file with the name `voltron.js`, which can be place anywhere your heart desires.

Your build file might look like this if you use `Fly`, which will probably be a little more complex than `gulp`.

```js
var reporter = require('fly/lib/reporter');
var spawn = require('fly/lib/cli/spawn');
var creed = require('creed');
var path = require('path');

module.exports = function(buildOpts) {
  var originalCwd = process.cwd();
  return creed.coroutine(spawn)(path.resolve(__dirname, '../../'))
    .then(function onSpawn(fly) {
      return reporter.call(fly)
``        .emit('fly_run', { path: fly.file })
        .start(['build:' + buildOpts.env], { value: buildOpts.outputDir });
    })
    .then(function onComplete(res) {
      //@NOTE: Fly currently hijacks the chdir, which messes up other code relying on process.cwd()
      process.chdir(originalCwd);
      return res;
    });
};
```
What is happening here is that we create a function that will accept the build options that can and should be passed into your build system/tools. You should make your build process able to handle a dynamic output directory otherwise Voltron won't provide any value. The function should start up your build process and doesn't actually need to return anything meaningful at this point in time. The result of this function should be a `Promise`, which allows Voltron to know when your build actually completes.

###Create a manifest
Your manifest was already needed to create a web extension, so if it follows the conventions listed earlier about naming you should not need to do anything else as Voltron knows what pieces of a manifest make sense to merge into another manifest.

###Using Voltron from your host/parent
We'll use H3H3 as our host extension and imagine that it has a build process setup already using a different technology, `grunt`.

Inside of your `package.json`, you'd have the following:

```json
{
    "dependencies": {
        "voltron-vapenation": "example/vapenation#v1.0.0"
    }
}
```

Part of our grunt tasks might look like this. Keep in mind that this is a simplified example not intended to represent everything you might do or how you might want to leverage Voltron.
```js
let voltron = require('voltron');

grunt.registerTask('chrome', 'Chrome extension in release mode.', function() {
    grunt.task.run(['voltron', 'chrome-manifest']);
});

let voltronManifest;
grunt.registerTask('voltron', function() {
    const done = this.async();
    const voltronProm = voltron({
        cwd: path.resolve(__dirname, '../../../node_modules'),
        manifest: require('../../../browsers/chrome/manifest.json'),
        buildOpts: {
          outputDir: path.resolve(__dirname, '../../../build/chrome/'),
          env: dynamicEnvironment
        }
    });
    voltronProm.then((manifest) => {
        voltronManifest = manifest;
        done();
    });
});

grunt.registerTask('chrome-manifest', chromeManifest(grunt));

function chromeManifest(grunt) {
  return function() {
    var done = this.async();

    let manifestSrc = fs.mkdtempSync('/tmp/voltron-') + '/manifest.json';
    fs.writeFileSync(manifestSrc, JSON.stringify(voltronManifest));

    gulp.src(manifestSrc)
      .pipe(data(grunt.config.get('manifest')))
      .pipe(swig())
      .pipe(rename('manifest.json'))
      .pipe(gulp.dest('build/chrome/'))
      .pipe(through.obj(done)); // Notify Grunt we're done
  };
}
```
The important part to this example is the voltron task. Remember, Voltron is built to handle the possibility of an asynchronous build in a child extension, in this case VapeNation. This means you must handle awaiting the result of the promise in your build system.

Voltron uses the `cwd` to know where to search through, so by limiting it to the host extensions's `node_modules` we can speed up the search. Next we have `manifest`, which is your JSON or POJO that contains your host/parent, H3H3's, manifest. We need this manifest to merge VapeNation's manifest into it to create a new manifest that will allow both extensions to run. Finally, we have `buildOpts` containing both an `outputDir` and an `environment`, which will tell VapeNation where it's build process should output/copy files.

The result of running Voltron will be a new manifest, as the results of the build process itself, ran from VapeNation's build file, will not produce anything directly of value for H3H3. After the Promise completes you'll receive the newly merged manifest, which you can use in a way that fits your build system best.
