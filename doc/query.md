#  Querying Blockchain Data

The `Query` module makes it easy to fetch data from nodes and indexers. It uses params passed as an object, rather than query strings. It can also convert the results in the desired naming case if needed.


First, make sure you add the `Query` module when initializing `AlgoStack`.

```js
import AlgoStack from 'algostack';
import Query from 'algostack/query';

const algostack = new AlgoStack({}, { Query });

// Available Options
// {
//   convertCase?: 'kebabcase' | 'snakecase' | 'camelcase' | 'none', // default: 'none'
// }
```

## Lookup Methods

AlgoStack uses the exact same endpoints and params as described in the [Indexer API documentation](https://app.swaggerhub.com/apis/algonode/indexer/2.0), but in a easier-to-read syntax.  

```ts
// algostack.lookup
interface lookup: {
  account: (accountId: string, params?: QueryParams) => Promise<Object>;
  accountTransactions: (accountId: string, params?: QueryParams) => Promise<Object>;
  application: (appId: number, params?: QueryParams) => Promise<Object>;
  asset: (assetId: number, params?: QueryParams) => Promise<Object>;
  assetBalances: (assetId: number, params?: QueryParams) => Promise<Object>;
  assetTransactions: (assetId: number, params?: QueryParams) => Promise<Object>;
  block: (round: number, params?: QueryParams) => Promise<Object>;
  transaction: (id: string, params?: QueryParams) => Promise<Object>;
};

//algostack.search
interface search: {
  accounts: (params?: QueryParams) => Promise<Object>;
  applications: (params?: QueryParams) => Promise<Object>;
  assets: (params?: QueryParams) => Promise<Object>;
  transactions: (params?: QueryParams) => Promise<Object>;
}
```


## Basic usage

Here's a quick example on how to fetch data from the blockchain. 

```js
import AlgoStack from 'algostack';
import Query from 'algostack/query';

// Set the case to 'camelcase', because we like it better that way
const algostack = new AlgoStack({
  convertCase: 'camelCase',
}, { Query });

// Let's check who's holding Gilbert, the AlGoanna #001 NFT
async function getHolder() {
  const results = await algostack.lookup.assetBalances(326189642, {
    currencyGreaterThan: 0, // using the case set in options
  });
  console.log(results);
}

// Should output this. 
// Case is converted as defined in the options
// {
//   "balances": [
//     {
//       "address": "4ZCVMTFIPWNWDERLRCA7IXQ4XM2WMBGMV4VPLIAEL6SRWN6D6W7TBTYYLU",
//       "amount": 1,
//       "deleted": false,
//       "isFrozen": false,
//       "optedInAtRound": 17318018
//     }
//   ],
//   "currentRound": 22611529,
//   "nextToken": "4ZCVMTFIPWNWDERLRCA7IXQ4XM2WMBGMV4VPLIAEL6SRWN6D6W7TBTYYLU"
// } 
```

### 🪄 Quick tip

If for some reason you need to fetch all results for a lookup call, usually yuo would call the endpoint multiple times using the `next` param with the `next-token` in it. Well... AlgoStack handles it for you. Simply use the `limit` parameter, and set it to `-1`. 

*Looping through all results is usually not a good practice. Use responsibly.*

```js
import AlgoStack from 'algostack';
import Query from 'algostack/query';

const algostack = new AlgoStack({
  convertCase: 'camelCase',
}, { Query });

// Let's get a list of all Degen Token holders
async function getDegenTokenHolders() {
  const results = await algostack.lookup.assetBalances(417708610, {
    limit: -1,
    currencyGreaterThan: 0,
  });
  console.log(results);
}
```