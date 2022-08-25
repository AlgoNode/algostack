# 📡 Sending Transactions


First, make sure you add the `Client` and `Txns` modules when initializing `AlgoStack`. Yes, you need a client to be connected to be able to sign and send transactions.

```js
import AlgoStack from 'algostack';
import Client from 'algostack/Client';
import Txns from 'algostack/Txns';

const algostack = new AlgoStack({}, { Client, Txns });
```

## Txns Methods

```ts
// algostack.txns
class Txns {
  // Send a single transaction
  sendTxn(params: TransactionLike): Promise<Record<string, any> | undefined>;

  // Send a transaction group
  // Every transaction must succeed for the group to be valid
  sendGroupedTxns(paramsGroup: TransactionLike[]): Promise<Record<string, any> | undefined>;

  // Send individual transactions one after the other
  // Wait for each one to succeed before sendind the next one
  // All transactions are signed at once though
  sendSequencedTxns(paramsSequence: TransactionLike[]): Promise<any[] | undefined>;
}
```


## Sending a simple transaction
The simplest implementation goes like this.

```js
import AlgoStack from 'algostack';
import Client from 'algostack/Client';
import Txns from 'algostack/Txns';
const algostack = new AlgoStack({}, { Client, Txns });;

async function sendTxn() {
  const txn = await algostack.txns.sendTxn({
    type: 'pay',
    from: algostack.client.addresses[0],
    to: algostack.client.addresses[0],
    amount: 0,
  });
  console.log('🎉 Confirmed:', txn);
}

// attach connect methods to ui elements
const sendBtn = document.getElementById('send-it');
sendBtn.addEventListener('click', sendTxn);
```
```html
<button id="send-it">
  Send It!
</button>
```


## Sending grouped transactions

```js
import AlgoStack from 'algostack';
import Client from 'algostack/Client';
import Txns from 'algostack/Txns';
const algostack = new AlgoStack({}, { Client, Txns });;

async function sendGroup() {
  const txn = await algostack.txns.sendGroupedTxn([
    {
      type: 'pay',
      from: algostack.client.addresses[0],
      to: algostack.client.addresses[0],
      amount: 0,
    },
    {
      type: 'pay',
      from: algostack.client.addresses[0],
      to: algostack.client.addresses[0],
      amount: 0,
    }
  ]);
  console.log('🎉 Grouped Confirmed:', txn);
}

// attach connect methods to ui elements
const sendBtn = document.getElementById('send-it');
sendBtn.addEventListener('click', sendGroup);
```
```html
<button id="send-it">
  Send It!
</button>
```
