# introduction

`named-logs-console` is an implementation of [named-logs facade](https://github.com/wighawag/named-logs) that redirect all call to console, preserving file/line.

It support namespace filtering like [debug](https://github.com/visionmedia/debug/) as well as log levels

By default the log level is 2 (warn)

# install

```bash
npm install named-logs named-logs-console
```

# use

in your index.js :

```js
import {hookup} from 'named-logs-console';
hookup();
```

This will be default log all `named-logs` call

On a web page,

if the query string contains `debug=<namespace>` it will enable only the namespaces listed there (separated per commas)

if the query string contains `log=<logLevel>` it will set the global log level to the one specified.

For logging inside the app you can import `named-logs`
This will allow you to extract that code into the library without importing the overhead of `named-logs-console`

```js
import {logs} from 'named-logs';
const console = logs('app:test');

console.log('whatever you want');
console.error('an error occured');
```

But you can still access named logs via `named-logs-console` even one created by libraries and disable them programmatically for example:

```js
import {logs} from 'named-logs-console';
logs('myLibrary').enabled = false;
```

You can also set global settings

```js
import {logs} from 'named-logs-console';
logs.level = 0; // desactivate all
```
