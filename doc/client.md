# 🔐 Connecting a Wallet Client


First, make sure you add the `Client` module when initializing `AlgoStack`. You can also specify if you want the browser to remember the wallets that are connected, even after refresh (default: true)

```js
import AlgoStack from 'algostack';
import Client from 'algostack/client';

const algostack = new AlgoStack({}, { Client });

// Available Options
// {
//   persistConnection?: boolean // default: true,
//   storageNamespace?: string // default: 'algostack',
// }
```

## Client Methods

```ts
// AlgoStack.Client
class Client {
  // [async] Connect to a wallet
  // Returns an array containing the connected address(es)
  connectMyAlgo(): Promise<false | string[]>;
  connectPera(): Promise<false | string[]>;
  // Disconnect from the connected wallet
  disconnect(): void;

  // Check the currently connected wallet
  get connected(): 'MYALGO' | 'PERA' | 'MNEMONIC' | undefined;
  // Get the currently connected address(es)
  get addresses(): string[];
  // If you need the raw connector, you can access it here
  get connector(): MyAlgo | Pera | undefined;
}
```


## Simple connection using MyAlgo and Pera Wallet
The simplest implementation goes like this.

```js
import AlgoStack from 'algostack';
import Client from 'algostack/client';
const algostack = new AlgoStack({}, { Client });

// attach connect methods to ui elements
const myalgoBtn = document.getElementById('myalgo-btn');
myalgoBtn.addEventListener('click', () => algostack.client.connectMyAlgo());
const peraBtn = document.getElementById('pera-btn');
peraBtn.addEventListener('click', () => algostack.client.connectPera());
```
```html
<button id="myalgo-btn">
  Connect using MyAlgo
</button>

<button id="pera-btn">
  Connect using Pera Wallet
</button>
```


## Wait for connection, then update your app

Connect methods are `async` functions, so you can wait for them to resolve before doing other stuff, like updating your app. Here's a quick example for updating variables: `connnected` and `addresses`. Note that in this example we call our `updateState()` function right after declaring it. Doing this, we can get the persisted values, if the client was already connected.

```js
import AlgoStack from 'algostack';
import Client from 'algostack/client';
const algostack = new AlgoStack({}, { Client });

let connected = undefined;
let addresses = [];

function updateState() {
  connected = !!algostack.client.connected;
  addresses = algostack.client.addresses;
}

// state is persisted, so we can already get the initial values
updateState();

// async functions that wait for connection before triggering updates
async function connectMyAlgo() {
  await algostack.client.connectMyAlgo();
  updateState();
}
async function connectPera() {
  await algostack.client.connectPera();
  updateState();
}

// attach connect methods to ui elements
const myalgoBtn = document.getElementById('myalgo-btn');
myalgoBtn.addEventListener('click', connectMyAlgo);
const peraBtn = document.getElementById('pera-btn');
peraBtn.addEventListener('click', connectPera);
```