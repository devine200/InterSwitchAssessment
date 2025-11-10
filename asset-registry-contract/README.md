# Asset Registry Smart Contract

A decentralized asset registry system built on Ethereum that allows users to register, track, and transfer digital assets on the blockchain. This project demonstrates a complete smart contract implementation with comprehensive testing and deployment capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)
- [Smart Contract API](#smart-contract-api)
- [Contributing](#contributing)

## 🎯 Overview

The Asset Registry is a Solidity smart contract that provides a decentralized way to register and manage digital assets. Each asset is uniquely identified by a hash-based ID and can be owned, queried, and transferred between addresses. The contract maintains a complete history of asset ownership and emits events for all important operations.

### Key Concepts

- **Asset Registration**: Users can register new assets with a description
- **Asset Ownership**: Each asset has a unique owner address
- **Asset Transfer**: Assets can be transferred to new owners
- **Asset Querying**: Assets can be retrieved by ID or by owner address

## ✨ Features

- ✅ Register new assets with custom descriptions
- ✅ Unique asset identification using cryptographic hashing
- ✅ Track asset ownership and timestamps
- ✅ Transfer assets between addresses
- ✅ Query assets by ID or owner
- ✅ Event emission for all operations
- ✅ Comprehensive test coverage
- ✅ Hardhat Ignition deployment support

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download](https://git-scm.com/)

For deployment to testnets/mainnets, you'll also need:

- An **Alchemy** account (or other Ethereum node provider) - [Sign up](https://www.alchemy.com/)
- A wallet with testnet ETH (for Sepolia testnet)

## 📦 Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd asset-registry-contract
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify installation**:
   ```bash
   npx hardhat --version
   ```

## ⚙️ Configuration

1. **Copy the environment example file**:
   ```bash
   cp .env-example .env
   ```

2. **Edit `.env` file** with your credentials:
   ```env
   PRIVATE_KEY=your-private-key-here
   ALCHEMY_API_KEY=your-alchemy-api-key-here
   ```

   > ⚠️ **Security Note**: Never commit your `.env` file to version control. The `.gitignore` file already excludes it.

3. **Get your Alchemy API Key**:
   - Sign up at [Alchemy](https://www.alchemy.com/)
   - Create a new app
   - Copy your API key from the dashboard

4. **Get your Private Key**:
   - Export from MetaMask or your wallet
   - Ensure the account has testnet ETH for deployment

## 🧪 Testing

The project includes comprehensive tests covering all contract functionality.

### Run All Tests

```bash
npx hardhat test
```

### Run Tests with Gas Reporting

```bash
REPORT_GAS=true npx hardhat test
```

### Run Tests in a Specific File

```bash
npx hardhat test test/AssetRegistry.js
```

### Test Coverage

The test suite includes:

- ✅ Contract deployment verification
- ✅ Asset registration functionality
- ✅ Asset retrieval by ID
- ✅ Asset retrieval by owner
- ✅ Asset transfer functionality
- ✅ Access control and security checks
- ✅ Event emission verification

## 🚀 Deployment

### Local Development Network

1. **Start a local Hardhat node**:
   ```bash
   npx hardhat node
   ```

2. **In a new terminal, deploy to local network**:
   ```bash
   npx hardhat ignition deploy ./ignition/modules/AssetRegistry.js --network localhost
   ```

### Sepolia Testnet

Deploy to Sepolia testnet:

```bash
npx hardhat ignition deploy ./ignition/modules/AssetRegistry.js --network sepolia
```

After deployment, you'll receive:
- Contract address
- Transaction hash
- Deployment status

## 💡 Usage Examples

### Example 1: Register a New Asset

```javascript
const { ethers } = require("hardhat");

async function registerAsset() {
  const [signer] = await ethers.getSigners();
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach("CONTRACT_ADDRESS");
  
  // Register a new asset
  const tx = await assetRegistry.registerNewAsset("My First Digital Asset");
  const receipt = await tx.wait();
  
  // Extract asset ID from event
  const event = receipt.logs.find(e => e.fragment.name === "AssetRegistered");
  const assetId = event.args.id;
  
  console.log("Asset registered with ID:", assetId);
}
```

### Example 2: Get Asset by ID

```javascript
async function getAsset(assetId) {
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach("CONTRACT_ADDRESS");
  
  const asset = await assetRegistry.getAsset(assetId);
  
  console.log("Asset ID:", asset.id);
  console.log("Owner:", asset.owner);
  console.log("Description:", asset.description);
  console.log("Timestamp:", asset.timestamp);
}
```

### Example 3: Get All Assets by Owner

```javascript
async function getOwnerAssets(ownerAddress) {
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach("CONTRACT_ADDRESS");
  
  const assets = await assetRegistry.getAssetsByOwner(ownerAddress);
  
  console.log(`Found ${assets.length} assets for owner ${ownerAddress}`);
  assets.forEach((asset, index) => {
    console.log(`Asset ${index + 1}:`, asset.description);
  });
}
```

### Example 4: Transfer an Asset

```javascript
async function transferAsset(assetId, newOwnerAddress) {
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach("CONTRACT_ADDRESS");
  
  const tx = await assetRegistry.transferAsset(assetId, newOwnerAddress);
  await tx.wait();
  
  console.log("Asset transferred successfully!");
}
```

### Example 5: Listen to Events

```javascript
async function listenToEvents() {
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach("CONTRACT_ADDRESS");
  
  // Listen for asset registration events
  assetRegistry.on("AssetRegistered", (id, owner, description, timestamp) => {
    console.log("New asset registered:", {
      id,
      owner,
      description,
      timestamp: new Date(timestamp * 1000)
    });
  });
  
  // Listen for asset transfer events
  assetRegistry.on("AssetTransferred", (id, newOwner) => {
    console.log("Asset transferred:", {
      id,
      newOwner
    });
  });
}
```

## 📁 Project Structure

```
asset-registry-contract/
├── contracts/
│   └── AssetRegistry.sol          # Main smart contract
├── test/
│   └── AssetRegistry.js           # Test suite
├── ignition/
│   └── modules/
│       └── AssetRegistry.js       # Deployment module
├── artifacts/                      # Compiled contracts (auto-generated)
├── cache/                          # Hardhat cache (auto-generated)
├── hardhat.config.js              # Hardhat configuration
├── package.json                    # Project dependencies
├── .env-example                    # Environment variables template
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

## 📚 Smart Contract API

### Functions

#### `registerNewAsset(string memory _description)`
Registers a new asset with a description.

- **Parameters**: 
  - `_description`: The description of the asset
- **Returns**: Transaction receipt
- **Events**: `AssetRegistered(bytes32 id, address owner, string description, uint256 timestamp)`

#### `getAsset(bytes32 _id)`
Retrieves an asset by its ID.

- **Parameters**: 
  - `_id`: The unique identifier of the asset
- **Returns**: `Asset` struct containing id, owner, description, and timestamp

#### `getAssetsByOwner(address _owner)`
Retrieves all assets owned by a specific address.

- **Parameters**: 
  - `_owner`: The address of the owner
- **Returns**: Array of `Asset` structs

#### `transferAsset(bytes32 _id, address _newOwner)`
Transfers an asset to a new owner.

- **Parameters**: 
  - `_id`: The unique identifier of the asset
  - `_newOwner`: The address of the new owner
- **Returns**: Transaction receipt
- **Events**: `AssetTransferred(bytes32 id, address newOwner)`
- **Requirements**: 
  - Caller must be the current owner
  - New owner cannot be zero address
  - New owner cannot be the same as current owner

### Events

- `AssetRegistered(bytes32 id, address owner, string description, uint256 timestamp)`
- `AssetTransferred(bytes32 id, address newOwner)`

### State Variables

- `owner`: Address of the contract owner (set during deployment)

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Run Hardhat Console

Interact with contracts in a JavaScript console:

```bash
npx hardhat console
```

### Clean Build Artifacts

```bash
npx hardhat clean
```

### Verify Contract on Etherscan

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```
