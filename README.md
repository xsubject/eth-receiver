# eth-receiver
A library that will help you receive ethereum in your project. 
This is an attempt to make your life a little easier, so you don't need to think about the database, this project creates a sqlite3 database on its own. 
But you must save the data you need, since in the future it is planned to destroy any irrelevant data in this database.

# Install
```
npm install eth-receiver
```

# Usage
```js
const Receiver = require('eth-receiver');

// You must provide the address of the websocket based node. It is recommended to use infura if you do not have a personal node
// new Receiver(node, value_for_confirm_tx, database_path)
const receiver = new Receiver('wss://ropsten.infura.io/ws/v3/53aa34f225694dca9e4fdcc4eb97c143', 12, 'receiver.db');
```

Use `receiver.onInit` to make sure the database is ready to go. However, this is not always necessary.
```js
receiver.onInit(() => {
...
})
```

Use the `newBlock` event to respond to new blocks.
```js
receiver.on('newBlock', blockHeader => {
  console.log("Block", blockHeader.hash, "created");
})
```

Create a disposable address and link the desired top-up amount to it. Pass the new address and amount to the user
```js
receiver.createAddress(100).then(account => {
  console.log("Send", account.amount, "wei to", account.address);
});
```

Use the `createdTransaction` event to react to new transactions in at least one block. You can already collect these coins and react as you see fit. However, this is not safe.
```js
receiver.on("createdTransaction", context => {
  console.log("tx", context.tx.hash, "created with id", context.row.id, "and wait to confirm");
});
```

The `confirmedTransaction` event will be triggered when the transaction receives more than `[value_for_confirm_tx from constructor]` confirmations
```js
receiver.on("confirmedTransaction", async (context) => {
  console.log("tx", context.tx.hash, "confirmed, id", context.row.id);

  // use `context.collect` to collect all coins for any other wallet
  let tx = await context.collect('0x0000000000000000000000000000000000000000');
  console.log("Created collect tx", tx);
});
```

