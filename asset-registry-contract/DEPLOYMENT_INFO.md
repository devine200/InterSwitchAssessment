# Asset Registry Contract Deployment Information

## Sepolia Testnet Deployment

**Contract Address:** `0x4de8A863f6FCa76498D26BE85Ff1323F5E01A6c2`

**Network:** Sepolia Testnet (Chain ID: 11155111)

**Deployment Block:** ~9600520

**Deployment Date:** November 10, 2025

## RPC URL

```
https://eth-sepolia.g.alchemy.com/v2/jgPR1HWDLqhbmqei7Z6PZkgSjFFygLUo
```

## Initial Assets Created

The following 5 assets were created during initial deployment:

1. **Asset ID:** `0xdbb2f4fff8e6e0690d91051552a95bf37d868a7b8435796298162c6715c06f73`
   - Description: "Digital Art Collection #001 - Abstract Composition"
   - Owner: `0xb1459DCF16905F7c84F4C22398c9CcAAD7345669`
   - Block: 9600526

2. **Asset ID:** `0x2f121541443b9ebb266f7e048454a1abd4f5a5bbda4c692ca2734016d270608a`
   - Description: "Real Estate Token - Downtown Office Building"
   - Owner: `0xb1459DCF16905F7c84F4C22398c9CcAAD7345669`
   - Block: 9600529

3. **Asset ID:** `0x496fabcdec45011af7c6239fc7fdc9c772157bf5f3771f37e3c2faafa5288c95`
   - Description: "Intellectual Property - Software Patent #2024-001"
   - Owner: `0xb1459DCF16905F7c84F4C22398c9CcAAD7345669`
   - Block: 9600530

4. **Asset ID:** `0x120690024b084f5391fc9ae9e3d52f8661c9e05028c3eca68eb5ac2d3484f5f2`
   - Description: "Collectible NFT - Rare Vintage Car"
   - Owner: `0xb1459DCF16905F7c84F4C22398c9CcAAD7345669`
   - Block: 9600531

5. **Asset ID:** `0x252eaac16f9d1a6229308499a91de807c5e14e12332cd57961626f8f64d142d7`
   - Description: "Commodity Certificate - Gold Reserve"
   - Owner: `0xb1459DCF16905F7c84F4C22398c9CcAAD7345669`
   - Block: 9600534

## Backend Configuration

To connect the backend to this deployed contract, update the `.env` file in `asset-registry-backend/`:

```env
PORT=3000
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/jgPR1HWDLqhbmqei7Z6PZkgSjFFygLUo
CONTRACT_ADDRESS=0x4de8A863f6FCa76498D26BE85Ff1323F5E01A6c2
SYNC_FROM_BLOCK=9600520
```

## Contract ABI

The contract ABI is available in:
- `artifacts/contracts/AssetRegistry.sol/AssetRegistry.json`
- `asset-registry-backend/contractABI.js` (updated)

## Verification

You can verify the contract on Etherscan:
```bash
npx hardhat verify --network sepolia 0x4de8A863f6FCa76498D26BE85Ff1323F5E01A6c2
```

