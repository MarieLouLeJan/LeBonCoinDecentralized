const hre =  require('hardhat');

async function main(){

    const Factory = await hre.ethers.getContractFactory("Factory");
    const SecondHandShop = await hre.ethers.getContractFactory("SecondHandShop");

    const factory = await Factory.deploy();

    await factory.deployed();

    console.log(`Contract deployed at ${factory.address}`)
    // console.log(factory)

}

main().catch((err) => {
    console.log(err);
    process.exitCode = 1;
})