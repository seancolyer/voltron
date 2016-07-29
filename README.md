#Voltron: Defender of Modular Extensions

##What is Voltron?
Voltron is a library for use while building a browser extension to allow for making individual extensions that can be combined into one extension.

##Why?
If you have an extension that runs on its own, but is deployed together with other extensions, you'll want a way to combine them all with the minimal amount of configuration

##How?
###Configuration
There are two choices on how to configure Voltron.

1. Place your config within your extension's `package.json`
2. Create a `voltron.js` file in the root of your project

Options 1 looks like this:
```json
{
    "name": "independent-extension",
    "voltron": {
        "build": "./relative/path/to/build/file.js",
        "manifest": "./relative/path/to/manifest/file.js"
    }
}
```

Option 2 looks like:
```js
module.exports = {
    build: './relative/path/to/build/file.js',
    manifest: './relative/path/to/manifest/file.js'
}
```

###Build File
Your build file is a module that exports a `function` that returns a `Promise`. The `Promise` is for coordinating other build steps that may need to wait on the child extension's build.

```js
module.exports = function() {
    return new Promise((resolve, reject) => {
        // do build stuff
        resolve(true);
    });
}
```

###Manifest File
Your manifest file can either be a JSON file or a js file that exports an object that has all the fields you want to merge into the parent manifest. Voltron will intelligently avoid certain keys that should not be merged and will add those that should be.

###Main Extension
Use Voltron during your build process to combine all extensions into one extension

```js
let voltron = require('voltron');
let voltronPromise = voltron(baseManifest);
```

Then depending on your build tool of choice, wait for the promise to resolve and you'll be returned a new manifest with all your extensions rolled up into one
