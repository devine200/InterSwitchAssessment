# Asset Registry Backend

A Node.js backend application that connects to an Ethereum blockchain network, listens for events from the AssetRegistry smart contract, stores event data in a SQLite database, and provides REST API endpoints to query the data.

## Features

- ✅ Connects to Ethereum testnet (Sepolia, Goerli, or any RPC endpoint)
- ✅ Listens for `AssetRegistered` and `AssetTransferred` events from the smart contract
- ✅ Stores event data in SQLite database
- ✅ Provides REST API endpoints to:
  - Fetch all registered assets
  - Fetch all transfers for a given asset ID
  - Fetch all assets owned by a given address
- ✅ Syncs historical events from a specified block number
- ✅ Graceful shutdown handling

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Deployed AssetRegistry smart contract address
- Ethereum RPC URL (e.g., Alchemy, Infura, or local node)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure your `.env` file:
```env
PORT=3000
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
CONTRACT_ADDRESS=0xYourDeployedContractAddress
SYNC_FROM_BLOCK=0  # Optional: block number to start syncing from
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### 1. Get All Registered Assets
**GET** `/api/assets`

Returns all assets registered in the system.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "0x1234...",
      "owner": "0xabcd...",
      "description": "Asset description",
      "timestamp": "1234567890",
      "registeredAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Transfers for an Asset
**GET** `/api/assets/:assetId/transfers`

Returns all transfer history for a specific asset.

**Parameters:**
- `assetId` (path parameter): The asset ID (bytes32 hex string, e.g., `0x1234...`)

**Response:**
```json
{
  "success": true,
  "assetId": "0x1234...",
  "count": 2,
  "data": [
    {
      "id": 1,
      "assetId": "0x1234...",
      "fromOwner": null,
      "toOwner": "0xabcd...",
      "blockNumber": "12345678",
      "transactionHash": "0xtxhash...",
      "timestamp": "1234567890",
      "transferredAt": "2024-01-01T00:00:00.000Z",
      "asset": {
        "id": "0x1234...",
        "description": "Asset description",
        "owner": "0xabcd..."
      }
    }
  ]
}
```

### 3. Get Assets by Owner Address
**GET** `/api/assets/owner/:address`

Returns all assets owned by a specific Ethereum address.

**Parameters:**
- `address` (path parameter): The Ethereum address (e.g., `0xabcd...`)

**Response:**
```json
{
  "success": true,
  "owner": "0xabcd...",
  "count": 2,
  "data": [
    {
      "id": "0x1234...",
      "owner": "0xabcd...",
      "description": "Asset description",
      "timestamp": "1234567890",
      "registeredAt": "2024-01-01T00:00:00.000Z",
      "transfers": [...]
    }
  ]
}
```

## Database Schema

### Asset Table
- `id` (STRING, PRIMARY KEY): Asset ID (bytes32)
- `owner` (STRING): Current owner address
- `description` (TEXT): Asset description
- `timestamp` (BIGINT): Registration timestamp from blockchain
- `registeredAt` (DATE): Local database timestamp

### Transfer Table
- `id` (INTEGER, PRIMARY KEY): Auto-increment ID
- `assetId` (STRING, FOREIGN KEY): Reference to Asset.id
- `fromOwner` (STRING, nullable): Previous owner (null for initial registration)
- `toOwner` (STRING): New owner address
- `blockNumber` (BIGINT): Block number of the transfer
- `transactionHash` (STRING, UNIQUE): Transaction hash
- `timestamp` (BIGINT): Block timestamp
- `transferredAt` (DATE): Local database timestamp

## Event Listening

The backend automatically:
1. Connects to the blockchain using the provided RPC URL
2. Listens for new `AssetRegistered` and `AssetTransferred` events
3. Stores event data in the database in real-time
4. Optionally syncs historical events if `SYNC_FROM_BLOCK` is set

## Error Handling

All endpoints include proper error handling and return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error

## Notes

- The database file (`database.sqlite`) is created automatically in the project root
- Addresses are normalized to lowercase for consistency
- The event listener will continue running and processing new events as they occur
- Use `SYNC_FROM_BLOCK` to backfill historical data when first setting up

## Troubleshooting

1. **Event listener not starting**: Check that `CONTRACT_ADDRESS` and `RPC_URL` are correctly set in `.env`
2. **Database errors**: Ensure SQLite3 is properly installed (`npm install sqlite3`)
3. **Connection errors**: Verify your RPC URL is accessible and the contract address is correct
4. **Port already in use**: Change the `PORT` in your `.env` file

