const SHA256 = require("crypto-js/sha256")
const EC = require("elliptic").ec;
const ec = new EC('secp256k1');

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
    }

    calculateHash() {
        return SHA256(
            this.fromAddress +
            this.toAddress +
            this.amount).toString()
    }

    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error("you cannot sign transactions from others wallet")
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }


    isValid() {
        if (this.fromAddress === null) return true;

        if (!this.signature || this.signature.length === 0) {
            throw new Error("no signature")
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return  publicKey.verify(this.calculateHash(), this.signature);
    }

}


class Block {
    constructor(timestamp, transactions, previosHash = "") {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previosHash = previosHash;
        this.hash = this.calculateHash()
        this.nonce = 0
    };

    calculateHash() {
        return SHA256(this.previosHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.previosHash + this.nonce).toString()
    }


    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash()
        }
        console.log("mined block", this.hash)
    }

    hasValidTransactions() {
        console.log("transactions",this.transactions)
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }

        return true;
    }
}


class BlockChain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    //to add first block manually
    createGenesisBlock() {
        return new Block(Date.parse('2017-01-01'), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }

    // addBlock(newBlock) {
    //     newBlock.previosHash = this.getLatestBlock().hash;

    //     newBlock.mineBlock(this.difficulty)
    //     // newBlock.hash = newBlock.calculateHash()
    //     this.chain.push(newBlock)
    // }

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);
    
        const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);
    
        this.chain.push(block);
    
        this.pendingTransactions = [];

    }

    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must include from and to address');
        }

        // Verify the transactiion
        if (!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction)
    }

    getBalanceOfAddress(address) {
        let balance = 0;
        console.log("chain", this.chain)
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount
                }

                if (trans.toAddress === address) {
                    balance += trans.amount
                }
            }
        }

        return balance;
    }


    isChainValid() {

        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previosBlock = this.chain[i - 1];


            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previosHash !== previosBlock.hash) {
                return false;
            }

            return true;

        }
    }

}



module.exports.BlockChain = BlockChain;
module.exports.Transaction = Transaction;