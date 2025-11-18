# install

```bash
npm install named-logs
```

# use in library

```js
import {logs} from 'named-logs';
const console = logs('yourLibraryName');

console.log('whatever you want');
console.error('an error occured');
```

# use in application

If you use a logging library that support `named-logs` you might not need to do anything else, except importing that lib that will call hook by itself.

For example, with [named-logs-console](https://github.com/wighawag/named-logs-console#readme) you can simply do in your root file (index.js)

```js
import {hookup} from 'named-logs-console';
hookup();
```

And now any library that use `named-logs` will have their log outputted to console but with full control on the app side. See [named-logs-console](https://github.com/wighawag/named-logs-console#readme) for more details.

You can also use `named-logs` for making the logging calls, this way part of your app can be broken up into self contained libary without requiring any logging library expect for `named-logs` facade.

# `named-logs` is a facade

`named-logs` basically act as a minimal facade for logging with minimal overhead while remaining flexible. Perfect for libraries that want to remain agnostic to the logging method used. the esm module weight less than 219 bytes.

you can build your own handler, by doing the following:
```js
import {hook} from 'named-logs';
hook((namespace) => {
    return window.console;
});
```
This is a simple example that will make all log use `window.console`.
namespace will not be used here though. see [named-logs-console](https://github.com/wighawag/named-logs-console#readme) for a logger that supprt `window.console` with namespace/log level filtering.
