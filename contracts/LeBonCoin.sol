// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

/**
 * @title  A second hand shop factory
 * @author Marie-Lou Le Jan
 * @notice A seller can use this contract to deploy secondHandShop contracts
 * @custom:experimental This is an experimental contract
 */
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

    /**
     * @notice Get the Factory contract owner
     * @return Address the Factory contract owner
     */

    function getOwner() public view returns(address){
        return owner;
    }

    /**
     * @notice Create a new second hand shop
     * @dev An address can create only one shop
     * @dev emit a 'ShopCreated' event
     */
    function createShop() public canCreateOnlyOne {
        address newShop = address(new SecondHandShop(msg.sender));
        ownerShop[msg.sender] = newShop;
        emit ShopCreated(msg.sender, newShop);
    }

    /**
     * @notice Get the shop address of a specific owner
     * @param _owner address
     * @return shop address
     */
    function getShop(address _owner) public view returns(address) {
        return ownerShop[_owner];
    }
}


/**
 * @title  A second hand shop
 * @author Marie-Lou Le Jan
 * @custom:experimental This is an experimental contract
 */
contract SecondHandShop {

    address owner;

    uint16 public salesNbr = 0;
    uint16 public offerNbr = 0;

    struct Sale {
        bytes32 item;
        uint price;
        bool sold;
        uint16 offerNbr;
    }

    struct Offer {
        uint16 saleId;
        uint price;
        address buyer;
        bool accepted;
        bool received;
    }

    uint256 public blockedAmount;
    uint256 public availableAmount;


    mapping(uint16 => Sale) public sales;
    mapping(uint16 => Offer) public offers;

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

    modifier saleExists(uint16 _id) {
        require(sales[_id].price > 0, 'This sale does not exist');
        _;
    }

    modifier priceMoreThanZero(uint _price) {
        require(_price > 0, 'Price can not be 0');
        _;
    }

    modifier saleNotSold(uint16 _id) {
        require(sales[_id].sold == false, 'This item is already sold');
        _;
    }

    modifier offerExists(uint16 _id) {
        require(offers[_id].buyer != address(0), 'This offer does not exist');
        _;
    }

    modifier onlyBuyer(uint16 _id) {
        require(offers[_id].buyer == msg.sender, 'You are not the buyer');
        _;
    }

    modifier offerAccepted(uint16 _id) {
        require(offers[_id].accepted == true, 'The owner did not accept your offer yet');
        _;
    }

    event CreateSale(address indexed owner, uint indexed saleId);
    event CreateOffer(address indexed buyer, uint indexed saleId, uint indexed priceOffered);
    event AcceptOffer(address indexed buyer, uint16 offerId);
    event Buy(address indexed buyer, uint16 offerId, uint indexed price);
    event Withdraw(address indexed owner, uint amount);

    function deposit() public payable {}

    /**
     * @dev only owner can call this function
     * @return contract balance
     */
    function getContractBalance() public view onlyOwner returns(uint){
        return address(this).balance;
    }

    /**
     * @dev only owner can call this function
     * @return availableAmount (amount owner can withdraw)
     */
    function getAvailableBalance() public view onlyOwner returns(uint){
        return availableAmount;
    }

    /**
     * @dev only owner can call this function
     * @return blockedAmount (buyers didnt confirm reveiving yet)
     */
    function getBlockedBalance() public view onlyOwner returns(uint){
        return blockedAmount;
    }

    /**
     * @return shop owner 
     */
    function getOwner() public view returns(address){
        return owner;
    }

    /**
     * @dev only owner can call this function
     * @return owner balance 
     */
    function getOwnerBalance() public view onlyOwner returns(uint){
        return owner.balance;
    }

    /**
     * @notice create a new sale
     * @dev only owner can call this function
     * @dev price must be higher than 0
     * @dev emit an event 'CreateSale'
     */
    function createSale(
        bytes32 _item, 
        uint _price
        ) public onlyOwner 
        priceMoreThanZero(_price) {

        salesNbr ++;
        sales[salesNbr] = Sale(
            _item,
            _price,
            false,
            0
        );
        emit CreateSale(msg.sender, salesNbr);
    }

    /**
     * @param _id the id of a specific sale
     * @dev the sale must exist
     * @return map of the sale
     */
    function getSale(
        uint16 _id
        ) public view 
        saleExists(_id)
        returns(bytes32, uint, bool, uint16) {

        Sale memory saleAsked = sales[_id];
        return (saleAsked.item, saleAsked.price, saleAsked.sold, saleAsked.offerNbr);

    }

    /**
     * @notice create a new offer
     * @param _saleId - id of the specific sale 
     * @param _price - price offered
     * @dev owner can't create offer 
     * @dev sale must exist
     * @dev sale must not be sold yet
     * @dev price must be higher than 0
     * @dev emit an event 'CreateOffer'
     */
    function addOffer(
        uint16 _saleId, 
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
                false,
                false
            );
            sales[_saleId].offerNbr ++;
            emit CreateOffer(msg.sender, _saleId, _price);

    }

    /**
     * @param _id the id of a specific offer
     * @dev the offer must exist
     * @return map of the offer
     */
    function getOffer(
        uint16 _id) public view
        offerExists(_id)
        returns(uint, uint, address, bool, bool) {

        Offer memory offerAsked = offers[_id];
        return (offerAsked.saleId, offerAsked.price, offerAsked.buyer, offerAsked.accepted, offerAsked.received);

    }

    /**
     * @notice the owner respond to a specific offer
     * @param _offerId the id of the offer
     * @param _isAccepted - bool - is accepted or not the offer
     * @dev the offer must exist
     * @dev only owner can respond to an offer
     * @dev if accepted = true > emit an event 'AcceptOffer'
     */
    function responseToOffer(
        uint16 _offerId, bool _isAccepted) 
        public
        offerExists(_offerId)
        onlyOwner {
        if(_isAccepted == true) {
            emit AcceptOffer(offers[_offerId].buyer, _offerId);
            offers[_offerId].accepted = _isAccepted;
        }
    }

    /**
     * @notice the buyer buy the sale
     * @param _offerId the id of the offer
     * @dev function must be payable
     * @dev the offer must exist
     * @dev only buyer who create the offer can buy 
     * @dev offer must have been accepted by owner
     * @dev sale must no be sold yet
     * @dev msg.value must be equal to price offered
     * @dev amount is send in 'blocked amount'
     */
    function buyTheSale(
        uint16 _offerId) 
        public payable
        offerExists(_offerId)
        onlyBuyer(_offerId)
        offerAccepted(_offerId)  {

        uint16 saleId = offers[_offerId].saleId;
        require(sales[saleId].sold == false, 'This item is already sold');
        require(offers[_offerId].price == msg.value, 'The price is not equal to the value you sent');
        deposit();

        blockedAmount += msg.value;

        sales[saleId].sold = true;
    }

    /**
     * @notice the buyer comfirm he received the item
     * @param _offerId the id of the offer
     * @dev only buyer who create the offer can comfirm
     * @dev offer must be marked as sold
     * @dev emit event 'Buy'
     * @dev amount is now available
     */
    function comfirmReceive(
        uint16 _offerId) 
        public 
        onlyBuyer(_offerId) {
        require(sales[_offerId].sold == true, 'This item is not sold');
        offers[_offerId].received = true;
        blockedAmount -= offers[_offerId].price;
        availableAmount += offers[_offerId].price;
        emit Buy(msg.sender, _offerId, offers[_offerId].price);

    }

    /**
     * @notice the buyer comfirm he received the item
     * @dev only owner can do the withdraw
     * @dev owner can withdraw only availableAmount
     * @dev emit event 'Withdraw'
     */
    function withdraw() public onlyOwner {
        uint amount = availableAmount;

        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to send Ether");
        availableAmount = 0;
        emit Withdraw(owner, amount);
    }

}