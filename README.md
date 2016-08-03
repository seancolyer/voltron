#Voltron: Defender of Modular Extensions

##What is Voltron?
Voltron is a library for use while building a browser extension to allow for making individual extensions that can be combined into one extension.

##Why?
If you have an extension that runs on its own, but is deployed together with other extensions, you'll want a way to combine them all with the minimal amount of configuration

##How?
###Conventions
Voltron uses mostly convention over configuration. The only configuration is related to the same things you'd need to get the individual child extensionrunning.

Voltron discovers your child extensions through the convention of looking through your dependencies for anything that matches `voltron-`.

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
Your build file is a module that exports a `function` that will receive the output directory for where it should build and returns a `Promise`. The `Promise` is for coordinating other build steps that may need to wait on the child extension's build to complete.

```js
module.exports = function(outputDirectory) {
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
Use Voltron during your build process to combine all extensions into one extension

```js
let voltron = require('voltron');
let voltronPromise = voltron(baseManifest, outputDirectory);
```

Your `baseManifest` will be your parent extension's manifest and the `outputDirectory` will be where you're building your extension to.
Then depending on your build tool of choice, wait for the promise to resolve and you'll be returned a new manifest with all your extensions rolled up into one.
