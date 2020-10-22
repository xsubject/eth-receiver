Context.prototype.collect = async function(address) {
  let web3 = this.receiver.web3;

  let account = web3.eth.accounts.privateKeyToAccount(this.row.privateKey);
  let balance = parseInt(await web3.eth.getBalance(account.address));
  if(balance == 0) {
    return;
  }
  let gasLimit = await web3.eth.estimateGas({to: address, amount: balance});
  gasLimit +=  parseInt(gasLimit / 10)
  let gasPrice = await web3.eth.getGasPrice();
  let nonce = await web3.eth.getTransactionCount(account.address);
  let value = balance - parseInt(gasLimit) * parseInt(gasPrice) - 1;

  if(value <= 0) {
    return;
  }

  let tx = {
    nonce: web3.utils.toHex(nonce),
    value: web3.utils.toHex(value),
    to: address,
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(gasLimit),
    data: '0x0'
  };
  let raw = await account.signTransaction(tx);
  return await web3.eth.sendSignedTransaction(raw.rawTransaction);
}

function Context(tx, row, receiver) {
  this.tx = tx;
  this.row = row;
  this.receiver = receiver;
}

module.exports = Context;
