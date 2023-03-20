# LeBonCoin - Decentralized App


## Project

Here is an example of a decentralized application offering a second hand store.

Two smart contracts are coded: 

### A first one we will call 'factory':

It allows any holder of a wallet to call the function 'createShop' in order to create his own private store. In this first contract, a mapping will allow us to find the shop of any seller thanks to his address. An address can only have one shop.

### A second one which is the shop on it own

The sales take place as such:

> Seller puts a product on sale (only seller, price != 0)

> A buyer offers an offer to the seller (not seller, product must be always for sale, price > 0)

> The seller responds prositively or negatively (only seller)

> If the seller responds positively, the buyer can proceed to payment (Only the buyer who make this offer can benefit from it, amount transferred === amount in offer)

> The funds are then transferred to the contract in a 'blockedBalance' variable

> Buyer confirms receipt (only him)

> Funds are transferred to a 'BalanceAvailable'

> The owner can now withdraw the funds from his personal wallet.


Please, have a look at the contract and the test to have more details about require, event etc.


## Tools & Technologies

- Solidity
- Javascript
- Hardhat
- Mocha (test)
- ethers.js


## Work in progress...

The interface is being developed and will be available soon.
