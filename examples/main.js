const Receiver = require('../lib/index');
const receiver = new Receiver('wss://ropsten.infura.io/ws/v3/53aa34f225694dca9e4fdcc4eb97c143', 3, 'receiver.db');


receiver.onInit(() => {
  receiver.on('newBlock', blockHeader => {
    console.log("Block", blockHeader.hash, "created");
  })

  receiver.createAddress(100).then(account => {
    console.log("Send", account.amount, "wei to", account.address);
  });

  receiver.on("createdTransaction", context => {
    console.log("tx", context.tx.hash, "created with id", context.row.id, "and wait to confirm");
  });

  receiver.on("confirmedTransaction", async (context) => {
    console.log("tx", context.tx.hash, "confirmed, id", context.row.id);

    let tx = await context.collect('0x0000000000000000000000000000000000000000');
    console.log("Created collect tx", tx);
  });
})
