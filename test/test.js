const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("Factory & Shop Unit Test", function(){

    let factory;
    let shopAddress;
    let shop;
    let creator;
    let seller1;
    let seller2;
    let buyer1;
    let buyer2;

    before(async () => {
        // GET ACCOUNTS
        [ creator, seller1, seller2, buyer1, buyer2 ] = await ethers.getSigners();

        // Deployed factory
        const Factory = await ethers.getContractFactory("Factory");
        const Shop = await ethers.getContractFactory("SecondHandShop");

        factory = await Factory.deploy();
        
        await factory.connect(seller1).createShop()
        shopAddress = await factory.getShop(seller1.address);
        shop = Shop.attach(shopAddress)
    })


    it('factory owner must be creator', async function () {
        const owner = await factory.getOwner()
        expect(owner).to.be.eq(creator.address)
    })


    it('owner can create only one shop', async function () {
        await expect(factory.connect(seller1).createShop()).to.be.revertedWith('You can only have one shop');
    })


    it(`can't add offer on non existent sale`, async () => {
        await expect(shop.connect(buyer1).addOffer(1, 5)).to.be.rejectedWith('This sale does not exist')

    });

    it(`can't respond to non existent offer`, async () => {
        await shop.connect(seller1).createSale(ethers.utils.formatBytes32String('TV'), 1000000);
        await expect(shop.connect(seller1).responseToOffer(1, true)).to.be.rejectedWith('This offer does not exist')
    });


    it('only owner can create sale', async () => {
        await expect(shop.connect(seller2).createSale(ethers.utils.formatBytes32String('TV'), 10)).to.be.rejectedWith('Owner only can run this transaction')
    })

    it(`owner can't create offer`, async () => {
        await expect(shop.connect(seller1).addOffer(1, 5)).to.be.rejectedWith('You can not create offer as you are the owner')
    });


    it(`can't buy sale if offer doesn't exist`, async () => {
        await expect(shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('This offer does not exist')
    });


    it(`only owner can respond to offer`, async () => {
        await shop.connect(buyer1).addOffer(1, 50000);
        await expect(shop.connect(seller2).responseToOffer(1, true)).to.be.rejectedWith('Owner only can run this transaction')
    });


    it(`can't buy sale that hasn't been approved by owner`, async () => {
        await expect(shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('The owner did not accept your offer yet')
    });


    it(`only buyer can buy sale with his offer`, async () => {
        await shop.connect(seller1).responseToOffer(1, true);
        await expect(shop.connect(buyer2).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('You are not the buyer')
    });


    it(`amount is not available until buyer dont comfirm receiving`, async () => {
        await shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})
        const amountBlocked = await shop.connect(seller1).getBlockedBalance()
        const amountAvailable = await shop.connect(seller1).getAvailableBalance()
        expect(amountBlocked).to.be.equal('50000')
        expect(amountAvailable).to.be.equal('0')
    });


    it(`only buyer can comfirm receiving`, async () => {
        await expect(shop.connect(seller1).comfirmReceive(1)).to.be.rejectedWith('You are not the buyer')
    });


    it(`amount is available after buyer confirm`, async () => {
        await shop.connect(buyer1).comfirmReceive(1);
        const amountBlocked = await shop.connect(seller1).getBlockedBalance()
        const amountAvailable = await shop.connect(seller1).getAvailableBalance()
        expect(amountBlocked).to.be.equal('0')
        expect(amountAvailable).to.be.equal('50000')
    });


    it(`only seller can withdraw`, async () => {
        await expect(shop.connect(seller2).withdraw()).to.be.rejectedWith('Owner only can run this transaction')
    }); 
});


describe("Factory & Shop Test", function(){

    let factory;
    let shopAddress;
    let shop;
    let creator;
    let seller1;
    let seller2;
    let buyer1;
    let buyer2;

    before(async () => {
        // GET ACCOUNTS
        [ creator, seller1, seller2, buyer1, buyer2 ] = await ethers.getSigners();

        // Deployed factory
        const Factory = await ethers.getContractFactory("Factory");
        const Shop = await ethers.getContractFactory("SecondHandShop");

        factory = await Factory.deploy();
        
        await factory.connect(seller1).createShop()
        shopAddress = await factory.getShop(seller1.address);
        shop = Shop.attach(shopAddress)
    })

    it(`can do a perfect transaction`, async () => {

        let txResult;

        // Get both contract and owner balance before starting selling items
        const contractBalanceBefore = await shop.connect(seller1).getContractBalance();
        const ownerBalanceBefore = await shop.connect(seller1).getOwnerBalance();

        // Seller create a sale
        const saleTX = await shop.connect(seller1).createSale(ethers.utils.formatBytes32String('Phone'), '10000000000000000');

        // Check the event 'CreateSale' is well emmited
        txResult = await saleTX.wait();
        const CreateSale = txResult.events.find(event => event.event === 'CreateSale');
        expect(CreateSale.args[0]).to.be.equal(seller1.address)
        expect(CreateSale.args[1]).to.be.equal(1)

        // Check the sale is registered 
        const saleCreation = await shop.getSale(1);
        expect(saleCreation[0]).to.be.equal(ethers.utils.formatBytes32String('Phone'))
        expect(saleCreation[1]).to.be.equal('10000000000000000')
        expect(saleCreation[2]).to.be.equal(false)

        // A seller create an offer for sale with id 1
        const offerTX = await shop.connect(buyer1).addOffer(1, '5000000000000000')

        // Check the event 'CreateOffer' is well emited
        txResult = await offerTX.wait();
        const CreateOffer = txResult.events.find(event => event.event === 'CreateOffer');
        expect(CreateOffer.args[0]).to.be.equal(buyer1.address)
        expect(CreateOffer.args[1]).to.be.equal(1)
        expect(CreateOffer.args[2]).to.be.equal('5000000000000000')

        
        // Check the offer is registered 
        const offerCreation = await shop.getOffer(1);
        expect(offerCreation[0]).to.be.equal(1)
        expect(offerCreation[1]).to.be.equal('5000000000000000')
        expect(offerCreation[2]).to.be.equal(buyer1.address)
        expect(offerCreation[3]).to.be.equal(false)

        // Seller send a positive answer to the offer
        const responseTX = await shop.connect(seller1).responseToOffer(1, true);

        // Check an event AcceptOffer is emmited
        txResult = await responseTX.wait();
        const AcceptOffer = txResult.events.find(event => event.event === 'AcceptOffer');
        expect(AcceptOffer.args[0]).to.be.equal(buyer1.address)
        expect(AcceptOffer.args[1]).to.be.equal(1)


        // The offer is now registered at accepted == true
        const offerValidation = await shop.getOffer(1);
        expect(offerValidation[3]).to.be.equal(true)

        // So the buyer can now buy the sale, with the exact price of the offer
        const buyTX = await shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("5000000000000000", "wei")})
        const sale = await shop.getSale(1);

        // Check that the sale.sold == true
        expect(sale[2]).to.be.equal(true);

        const contractBalanceAfter = await shop.connect(seller1).getContractBalance();
        // After the transaction, we expect the contract balance to be higher than before
        expect(contractBalanceAfter).to.be.above(contractBalanceBefore);
        // And we expect the amount to be blocked
        const amountBlocked = await shop.connect(seller1).getBlockedBalance();
        expect(amountBlocked).to.be.equal('5000000000000000')

        // The buyer confirm the receiving
        const comfirmTX = await shop.connect(buyer1).comfirmReceive(1);
        const amountAvailable = await shop.connect(seller1).getAvailableBalance();
        expect(amountAvailable).to.be.equal('5000000000000000')

        // An event Buy is emmited
        txResult = await comfirmTX.wait();
        const Buy = txResult.events.find(event => event.event === 'Buy');
        expect(Buy.args[0]).to.be.equal(buyer1.address)
        expect(Buy.args[1]).to.be.equal(1)
        expect(Buy.args[2]).to.be.equal('5000000000000000')

        // And the seller can claim his ETH
        const withdrawTX = await shop.connect(seller1).withdraw();
        const ownerBalanceAfter = await shop.connect(seller1).getOwnerBalance();

        // We accept his balance to be higher than before
        expect(ownerBalanceAfter).to.be.above(ownerBalanceBefore);

        // An event Withdraw is emmited
        txResult = await withdrawTX.wait();
        const Withdraw = txResult.events.find(event => event.event === 'Withdraw');
        expect(Withdraw.args[0]).to.be.equal(seller1.address)
        expect(Withdraw.args[1]).to.be.equal(contractBalanceAfter)


        // Finally, we expect the contract balance to be equal to 0 as well as the amountBlocked and amountAvailable
        const contractBalanceAfterWithdraw = await shop.connect(seller1).getContractBalance();
        expect(contractBalanceAfterWithdraw).to.be.equal(0)
        const amountBlockedFinal = await shop.connect(seller1).getBlockedBalance()
        const amountAvailableFinal = await shop.connect(seller1).getAvailableBalance()
        expect(amountBlockedFinal).to.be.equal('0')
        expect(amountAvailableFinal).to.be.equal('0')

        // ALL GOOD MY FRIEND !
    })
})


