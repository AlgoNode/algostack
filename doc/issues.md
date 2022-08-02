# ❌ Common Issues

AlgoStack is built using the ESModule version of its dependencies to make sure that the final compilation is the one responsible for making everything nice and tidy. That being said, it can lead to some compiler complications when trying to build a browser version of the stack.

**AlgoStack.js might include a pre-compiled browser version in the future.* 


## 🖥️ Browser errors

### Failed to resolve module specifier "crypto"

```
Uncaught TypeError: Failed to resolve module specifier "crypto". Relative references must start with either "/", "./", or "../".
```

This happens when you're trying to compile for the browser, and the `crypto` module is only available in a NodeJs environment. To prevent the error, you can ignore the module if you're using commonjs to transpile your code.

#### Fix `[Rollup.js]`

```js
// rollup.config.js
export default {
  // ...
  plugins: [
    commonjs({
      ignore: ['crypto'],
    }),
  ]
}
```

## 📦 Compiler errors


### preferring built-in module 'buffer' over local alternative

```
preferring built-in module 'buffer' over local alternative at '...', pass 'preferBuiltins: false' to disable this behavior or 'preferBuiltins: true' to disable this warning
```

This happens when you're trying to compile a browser environment, and the compiler warns you that it would prefer using the built-in `Buffer` module. The stack already includes a buffer polyfill so you can prevent this error by telling the compiler to avoid using built-ins.

##### Fix `Rollup.js` 
```js
// rollup.config.js
export default {
  // ...
  plugins: [
    resolve({
      preferBuiltins: false,
    }),
  ]
}
```


### Illegal reassignment GENTLY

```
Illegal reassignment to import 'commonjsRequire'
1: if (global.GENTLY) require = GENTLY.hijack(require);
```
##### Fix `Rollup.js` 

 [DIRTY HACK] Add a plugin to find/replace this reassignment coming from a dependency of the `algosdk.js` package.

```js
// rollup.config.js
import replace from 'rollup-plugin-re'

export default {
  // ...
  plugins: [
    // resolve(),
    // ...
    replace({  // after resolve(), before commonjs()
      patterns: [
        {
          match: /formidable(\/|\\)lib/, 
          test: 'if (global.GENTLY) require = GENTLY.hijack(require);', 
          replace: '',
        }
      ]
    }),
    // ...
    // commonjs(),
  ]
}
```