// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract AssetRegistry {
    address public owner;
    struct Asset {
        bytes32 id;
        address owner;
        string description;
        uint256 timestamp;
    }    

    mapping(bytes32 => Asset) private _assets;
    mapping(address => Asset[]) private _assetsByOwner;

    event AssetRegistered(bytes32 id, address owner, string description, uint256 timestamp);
    event AssetTransferred(bytes32 id, address newOwner);

    constructor() {
        owner = msg.sender;
    }

    /** @dev Register a new asset with a description and timestamp
     * @param _description The description of the asset
     * @notice The asset is registered with the sender's address, description, and timestamp
     */
    function registerNewAsset(string memory _description) external {
        bytes32 id = keccak256(abi.encodePacked(msg.sender, _description, block.timestamp));
        require(_assets[id].owner == address(0), "Asset already registered");

        _assets[id] = Asset({
            id: id,
            owner: msg.sender,
            description: _description,
            timestamp: block.timestamp
        });
        _assetsByOwner[msg.sender].push(_assets[id]);
        emit AssetRegistered(id, msg.sender, _description, block.timestamp);
    }

    /** @dev Get an asset by its ID
     * @param _id The ID of the asset
     * @return The asset
     */
    function getAsset(bytes32 _id) external view returns (Asset memory) {
        return _assets[_id];
    }

    /** @dev Get all assets by an owner
     * @param _owner The owner of the assets
     * @return The assets
     */
    function getAssetsByOwner(address _owner) external view returns (Asset[] memory) {
        return _assetsByOwner[_owner];
    }

    /** @dev Transfer an asset to a new owner
     * @param _id The ID of the asset
     * @param _newOwner The new owner of the asset
     * @notice The asset is transferred to the new owner
     */
    function transferAsset(bytes32 _id, address _newOwner) external {
        Asset storage asset = _assets[_id];
        require(asset.owner == msg.sender, "You are not the owner of this asset");
        require(_newOwner != address(0), "New owner cannot be the zero address");
        require(asset.owner != _newOwner, "New owner cannot be the same as the current owner");

        asset.owner = _newOwner;
        emit AssetTransferred(_id, _newOwner);
    }
}
