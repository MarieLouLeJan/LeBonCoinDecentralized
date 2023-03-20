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

        await shop.connect(seller1).createSale('TV', 10);
        await expect(shop.connect(seller1).responseToOffer(1, true)).to.be.rejectedWith('This offer does not exist')
    
    });


    it('only owner can create sale', async () => {
        await expect(shop.connect(seller2).createSale('TV', 10)).to.be.rejectedWith('Owner only can run this transaction')
    })

    it(`owner can't create offer`, async () => {

        await shop.connect(seller1).createSale('TV', 10);
        await expect(shop.connect(seller1).addOffer(1, 5)).to.be.rejectedWith('You can not create offer as you are the owner')
    });


    it(`can't buy sale if offer doesn't exist`, async () => {

        await shop.connect(seller1).createSale('TV', 10);
        await expect(shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('This offer does not exist')

    });


    it(`only owner can respond to offer`, async () => {

        await shop.connect(seller1).createSale('TV', 10);
        await shop.connect(buyer1).addOffer(1, 5);
        await expect(shop.connect(seller2).responseToOffer(1, true)).to.be.rejectedWith('Owner only can run this transaction')
    });


    it(`can't buy sale that hasn't been approved by owner`, async () => {

        await shop.connect(seller1).createSale('TV', 1000000);
        await shop.connect(buyer1).addOffer(1, 50000);
        await expect(shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('The owner did not accept your offer yet')
    
    });


    it(`only buyer can buy sale with his offer`, async () => {

        await shop.connect(seller1).createSale('TV', 1000000);
        await shop.connect(buyer1).addOffer(1, 50000);
        await shop.connect(seller1).responseToOffer(1, true);
        await expect(shop.connect(buyer2).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})).to.be.rejectedWith('You are not the buyer')
    
    });


    it(`only owner can withdraw`, async () => {

        await shop.connect(seller1).createSale('TV', 1000000);
        await shop.connect(buyer1).addOffer(1, 50000);
        await shop.connect(seller1).responseToOffer(1, true);
        await shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("50000", "wei")})
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

        // Get both contract and owner balance before starting selling items
        const contractBalanceBefore = await shop.connect(seller1).getContractBalance();
        const ownerBalanceBefore = await shop.connect(seller1).getOwnerBalance();

        // Seller create a sale
        const saleTX = await shop.connect(seller1).createSale('Phone', '10000000000000000');
        // Check the event 'CreateSale' is well emmited
        expect(saleTX)
            .to.emit(shop, 'CreateSale')
            .withArgs({owner: seller1, saleId: 1})

        // Check the sale is registered 
        const saleCreation = await shop.getSale(1);
        expect(saleCreation[0]).to.be.equal('Phone')
        expect(saleCreation[1]).to.be.equal('10000000000000000')
        expect(saleCreation[2]).to.be.equal(false)

        // A seller create an offer for sale with id 1
        const offerTX = await shop.connect(buyer1).addOffer(1, '5000000000000000')
        // An event is emmited
        expect(offerTX)
            .to.emit(shop, 'CreateOffer')
            .withArgs({buyer: buyer1, saleId: 1, priceOffered: '5000000000000000'});
        
        // Check the offer is registered 
        const offerCreation = await shop.getOffer(1);
        expect(offerCreation[0]).to.be.equal(1)
        expect(offerCreation[1]).to.be.equal('5000000000000000')
        expect(offerCreation[2]).to.be.equal(buyer1.address)
        expect(offerCreation[3]).to.be.equal(false)

        // Seller send a positive answer to the offer
        const responseTX = await shop.connect(seller1).responseToOffer(1, true);
        // Check an event is emmited
        expect(responseTX)
            .to.emit(shop, 'CreateOffer')
            .withArgs({buyer: buyer1, offerId: 1});

        // The offer is now registered at accepted == true
        const offerValidation = await shop.getOffer(1);
        expect(offerValidation[3]).to.be.equal(true)

        // So the buyer can now buy the sale, with the exact or higher price of the offer
        const buyTX = await shop.connect(buyer1).buyTheSale(1, {value: ethers.utils.parseUnits("5000000000000000", "wei")})
        // An event is emmited
        expect(buyTX)
            .to.emit(shop, 'CreateOffer')
            .withArgs({buyer: buyer1, offerId: 1, price: '5000000000000000'});

        const sale = await shop.getSale(1);
        // Check that the sale.sold == true
        expect(sale[2]).to.be.equal(true);

        const contractBalanceAfter = await shop.connect(seller1).getContractBalance();
        // After the transaction, we expect the contract balance to be higher than before
        expect(contractBalanceAfter).to.be.above(contractBalanceBefore);

        // The seller can claim his ETH
        const withdrawTX = await shop.connect(seller1).withdraw();
        const ownerBalanceAfter = await shop.connect(seller1).getOwnerBalance();
        // We accept his balance to be higher than before
        expect(ownerBalanceAfter).to.be.above(ownerBalanceBefore);
        // And check the event was emmited
        expect(withdrawTX)
            .to.emit(shop, 'Withdraw')
            .withArgs({owner: seller1, amount: contractBalanceAfter});

        // Finally, we expect the contract balance to be equal to 0
        const contractBalanceAfterWithdraw = await shop.connect(seller1).getContractBalance();
        expect(contractBalanceAfterWithdraw).to.be.equal(0)

        // ALL GOOD MY FRIEND !
    })
})






















