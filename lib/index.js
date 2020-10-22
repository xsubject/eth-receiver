const Web3 = require('web3');
const sqlite3 = require('sqlite3').verbose();
const eventer = require('./eventer');
const Context = require('./context');

Receiver.prototype._init_tables = function() {
  this.db.run('CREATE TABLE IF NOT EXISTS `addresses` ('
    +'`id` INTEGER PRIMARY KEY AUTOINCREMENT,'
    +'`address` varchar(42) NOT NULL,'
    +'`privateKey` varchar(64) NOT NULL,'
    +'`txid` varchar(64) DEFAULT NULL,'
    +'`blockNumber` INTEGER DEFAULT NULL,'
    +'`amount` bigint(20) NOT NULL DEFAULT \'0\','
    +'`status` bigint(20) NOT NULL DEFAULT \'0\','
    +'`collected` tinyint(4) NOT NULL DEFAULT \'0\','
    +'`created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'
  +');');
}

Receiver.prototype._init = function() {
  this._init_tables();

  this.createAddress = async (amount=0) => {
    let account = this.web3.eth.accounts.create();
    let stmt = this.db.prepare("INSERT INTO addresses (address, privateKey, amount) VALUES (?, ?, ?)");
    stmt.run(account.address, account.privateKey, amount);
    stmt.finalize();

    return {
      address: account.address,
      amount: amount,
      privateKey: account.privateKey
    };
  }

  this.listener = this.web3.eth.subscribe('newBlockHeaders',
                    (err, blockHeader) => this._onNewBlock(err, blockHeader));

  this.inited = true;
  this._callInitedCallback();
}

Receiver.prototype._onNewBlock = async function(error, blockHeader) {
  if(error) {
    throw error;
    return;
  }
  this.eventer.emit('newBlock', blockHeader)

  // find new txs
  let block = await this.web3.eth.getBlock(blockHeader.hash, true);

  let recipients = block.transactions.map(tx => tx.to)
                        .filter((item, pos, arr) => arr.indexOf(item) == pos)
                        .map(addr => '\'' + addr + '\'');
  let txsByAddr = {};
  block.transactions.map(tx => {
    if(!txsByAddr[tx.to]) txsByAddr[tx.to] = [];
    txsByAddr[tx.to].push(tx);
  })

  this.db.each("SELECT * FROM addresses WHERE address IN ("+ recipients.join(",") +")", async (err, row) => {
    let balance = await this.web3.eth.getBalance(row.address);
    if(balance < row.amount) return;

    let stmt = this.db.prepare("UPDATE addresses SET status = 1, txid = ?, blockNumber = ? WHERE id = ?");
    stmt.run(txsByAddr[row.address][0].hash, txsByAddr[row.address][0].blockNumber, row.id)
    stmt.finalize();


    row.status = 1;
    row.blockNumber = txsByAddr[row.address][0].blockNumber;
    row.txid = txsByAddr[row.address][0].hash;

    this.eventer.emit('createdTransaction', new Context(txsByAddr[row.address][0], row, this));
  });

  // find confirmed txs
  this.db.each("SELECT * FROM addresses WHERE status = 1 AND blockNumber < " + (block.number-this.confirmAmount), async (err, row) => {
    let balance = await this.web3.eth.getBalance(row.address);
    if(balance < row.amount) return;

    let tx = await this.web3.eth.getTransaction(row.txid);
    if(tx == null) {
      return;
    }

    let stmt = this.db.prepare("UPDATE addresses SET status = 2 WHERE id = ?");
    stmt.run(row.id);
    stmt.finalize();

    this.eventer.emit('confirmedTransaction', new Context(tx, row, this));
  })
}

Receiver.prototype._callInitedCallback = function() {
  if(this.initedCb && this.inited) {
    this.initedCb();
    this.initedCb = undefined;
  }
}

Receiver.prototype.onInit = function(fn) {
  this.initedCb = fn;
  if(this.inited) {
    this._callInitedCallback();
  }
}

Receiver.prototype.on = function(eventName, cb) {
  return this.eventer.on(eventName, cb);
}

function Receiver(node, confirmAmount=3, db="./receiver.db") {
  this.web3 = new Web3(node);
  this.db = new sqlite3.Database(db);
  this.inited = false;
  this.initedCb = undefined;
  this.listener = undefined;
  this.eventer = eventer();
  this.confirmAmount = confirmAmount;

  this.db.serialize(() => this._init());
}

module.exports = Receiver
