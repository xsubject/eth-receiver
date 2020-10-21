const Web3 = require('web3');

function Receiver(node) {
  this.web3 = new Web3(node);
}

module.exports = Receiver
