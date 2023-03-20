// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

// IMPORT THE HARDHAT CONSOLE
import "hardhat/console.sol";

contract Factory {

    address owner;

    // mapping of the owner address to their shop contract address
    mapping(address => address) public ownerShop;

    event ShopCreated(address indexed owner, address indexed shop);

    modifier canCreateOnlyOne() {
        require(ownerShop[msg.sender] == address(0), 'You can only have one shop');
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getOwner() public view returns(address){
        return owner;
    }

    // Create a new shop (instance)
    function createShop() public canCreateOnlyOne {
        address newShop = address(new SecondHandShop(msg.sender));
        ownerShop[msg.sender] = newShop;
        emit ShopCreated(msg.sender, newShop);
    }

    // Getting the shop address from owner address
    function getShop(address _owner) public view returns(address) {
        return ownerShop[_owner];
    }
}

contract SecondHandShop {

    address owner;

    struct Sale {
        string product;
        uint price;
        bool sold;
        uint offerNbr;
    }

    struct Offer {
        uint saleId;
        uint price;
        address buyer;
        bool accepted;
    }

    uint256 internal salesNbr = 0;
    uint256 internal offerNbr = 0;

    mapping(uint256 => Sale) internal sales;
    mapping(uint256 => Offer) internal offers;

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'Owner only can run this transaction');
        _;
    }

    modifier notOwner() {
        require(msg.sender != owner, 'You can not create offer as you are the owner');
        _;
    }

    modifier saleExists(uint _id) {
        require(sales[_id].price > 0, 'This sale does not exist');
        _;
    }

    modifier priceMoreThanZero(uint _price) {
        require(_price > 0, 'Price can not be 0');
        _;
    }

    modifier saleNotSold(uint _id) {
        require(sales[_id].sold == false, 'This item is already sold');
        _;
    }

    modifier offerExists(uint _id) {
        require(offers[_id].buyer != address(0), 'This offer does not exist');
        _;
    }

    modifier onlyBuyer(uint _id) {
        require(offers[_id].buyer == msg.sender, 'You are not the buyer');
        _;
    }

    modifier offerAccepted(uint _id) {
        require(offers[_id].accepted == true, 'The owner did not accept your offer yet');
        _;
    }

    event CreateSale(address indexed owner, uint indexed saleId);
    event CreateOffer(address indexed buyer, uint indexed saleId, uint indexed priceOffered);
    event AcceptOffer(address indexed buyer, uint offerId);
    event Buy(address indexed buyer, uint offerId, uint indexed price);
    event Withdraw(address indexed owner, uint amount);

    function deposit() public payable {}

    function getContractBalance() public view onlyOwner returns(uint){
        return address(this).balance;
    }

    function getOwner() public view returns(address){
        return owner;
    }

    function getOwnerBalance() public view onlyOwner returns(uint){
        return owner.balance;
    }

    function createSale(
        string memory _product, 
        uint _price
        ) public onlyOwner 
        priceMoreThanZero(_price) {

        salesNbr ++;
        sales[salesNbr] = Sale(
            _product,
            _price,
            false,
            0
        );
        emit CreateSale(msg.sender, salesNbr);
    }

    function getSale(
        uint256 _id
        ) public view 
        saleExists(_id)
        returns(string memory, uint, bool) {

        Sale memory saleAsked = sales[_id];
        return (saleAsked.product, saleAsked.price, saleAsked.sold);

    }

    function addOffer(
        uint256 _saleId, 
        uint256 _price) public 
        notOwner 
        saleExists(_saleId) 
        saleNotSold(_saleId)  
        priceMoreThanZero(_price) {

            offerNbr ++;
            offers[offerNbr] = Offer(
                _saleId,
                _price,
                msg.sender,
                false
            );
            sales[_saleId].offerNbr ++;
            emit CreateOffer(msg.sender, _saleId, _price);

    }

    function getOffer(
        uint256 _id) public view
        offerExists(_id)
        returns(uint, uint, address, bool) {

        Offer memory offerAsked = offers[_id];
        return (offerAsked.saleId, offerAsked.price, offerAsked.buyer, offerAsked.accepted);

    }

    function responseToOffer(
        uint256 _offerId, bool _isAccepted) 
        public
        offerExists(_offerId)
        onlyOwner {
        if(_isAccepted == true) {
            emit AcceptOffer(offers[_offerId].buyer, _offerId);
            offers[_offerId].accepted = _isAccepted;
        }
    }


    function buyTheSale(
        uint256 _offerId) 
        public payable
        offerExists(_offerId)
        onlyBuyer(_offerId)
        offerAccepted(_offerId)  {

        uint saleId = offers[_offerId].saleId;
        require(sales[saleId].sold == false, 'This product is already sold');
        require(offers[_offerId].price <= msg.value, 'The price is higher than the value you sent');
        deposit();
        emit Buy(msg.sender, _offerId, msg.value);
        sales[saleId].sold = true;
    }

    function withdraw() public onlyOwner {
        uint amount = address(this).balance;

        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to send Ether");
        emit Withdraw(owner, amount);
    }

}