import { ethers } from 'ethers';
import { Asset, Transfer } from './db.js';

/**
 * Event listener service that connects to the blockchain and listens for events
 */
export class EventListener {
  constructor(contractAddress, rpcUrl, contractABI) {
    this.contractAddress = contractAddress;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
    this.isListening = false;
  }

  /**
   * Start listening for events from the smart contract
   */
  async startListening() {
    if (this.isListening) {
      console.log('Event listener is already running');
      return;
    }

    this.isListening = true;
    console.log(`Starting event listener for contract at ${this.contractAddress}`);

    // Listen for AssetRegistered events
    this.contract.on('AssetRegistered', async (id, owner, description, timestamp, event) => {
      try {
        await this.handleAssetRegistered(id, owner, description, timestamp, event);
      } catch (error) {
        console.error('Error handling AssetRegistered event:', error);
      }
    });

    // Listen for AssetTransferred events
    this.contract.on('AssetTransferred', async (id, newOwner, event) => {
      try {
        await this.handleAssetTransferred(id, newOwner, event);
      } catch (error) {
        console.error('Error handling AssetTransferred event:', error);
      }
    });

    console.log('Event listener started successfully');
  }

  /**
   * Handle AssetRegistered events
   */
  async handleAssetRegistered(id, owner, description, timestamp, event) {
    const assetId = id.toString();
    const ownerAddress = owner.toLowerCase();
    const timestampValue = timestamp.toString();

    console.log(`AssetRegistered: ${assetId} by ${ownerAddress}`);

    // Check if asset already exists
    const existingAsset = await Asset.findByPk(assetId);
    
    if (!existingAsset) {
      await Asset.create({
        id: assetId,
        owner: ownerAddress,
        description: description,
        timestamp: timestampValue,
        registeredAt: new Date()
      });
      console.log(`Asset ${assetId} stored in database`);
    } else {
      console.log(`Asset ${assetId} already exists in database`);
    }

    // Also create a transfer record for the initial registration
    // Handle both ethers v6 event structures (from .on() and queryFilter)
    const log = event.log || event;
    const transferHash = log.transactionHash || log.hash;
    const blockNumber = log.blockNumber;
    
    if (transferHash && blockNumber) {
      const existingTransfer = await Transfer.findOne({
        where: { transactionHash: transferHash }
      });

      if (!existingTransfer) {
        await Transfer.create({
          assetId: assetId,
          fromOwner: null, // null for initial registration
          toOwner: ownerAddress,
          blockNumber: blockNumber.toString(),
          transactionHash: transferHash,
          timestamp: timestampValue,
          transferredAt: new Date()
        });
        console.log(`Initial transfer record created for asset ${assetId}`);
      }
    }
  }

  /**
   * Handle AssetTransferred events
   */
  async handleAssetTransferred(id, newOwner, event) {
    const assetId = id.toString();
    const newOwnerAddress = newOwner.toLowerCase();

    console.log(`AssetTransferred: ${assetId} to ${newOwnerAddress}`);

    // Update the asset owner
    const asset = await Asset.findByPk(assetId);
    if (asset) {
      const previousOwner = asset.owner;
      asset.owner = newOwnerAddress;
      await asset.save();

      // Create transfer record
      // Handle both ethers v6 event structures (from .on() and queryFilter)
      const log = event.log || event;
      const transferHash = log.transactionHash || log.hash;
      const blockNumber = log.blockNumber;
      
      if (transferHash && blockNumber) {
        const existingTransfer = await Transfer.findOne({
          where: { transactionHash: transferHash }
        });

        if (!existingTransfer) {
          // Get block timestamp
          const block = await this.provider.getBlock(blockNumber);
          const blockTimestamp = block ? block.timestamp.toString() : Date.now().toString();

          await Transfer.create({
            assetId: assetId,
            fromOwner: previousOwner,
            toOwner: newOwnerAddress,
            blockNumber: blockNumber.toString(),
            transactionHash: transferHash,
            timestamp: blockTimestamp,
            transferredAt: new Date()
          });
          console.log(`Transfer record created for asset ${assetId}`);
        }
      }
    } else {
      console.warn(`Asset ${assetId} not found in database when processing transfer`);
    }
  }

  /**
   * Sync historical events from a specific block number
   */
  async syncHistoricalEvents(fromBlock = 0) {
    console.log(`Syncing historical events from block ${fromBlock}`);
    
    try {
      // Get AssetRegistered events
      const registeredFilter = this.contract.filters.AssetRegistered();
      const registeredEvents = await this.contract.queryFilter(registeredFilter, fromBlock);

      for (const event of registeredEvents) {
        const [id, owner, description, timestamp] = event.args;
        await this.handleAssetRegistered(id, owner, description, timestamp, event);
      }

      // Get AssetTransferred events
      const transferredFilter = this.contract.filters.AssetTransferred();
      const transferredEvents = await this.contract.queryFilter(transferredFilter, fromBlock);

      for (const event of transferredEvents) {
        const [id, newOwner] = event.args;
        await this.handleAssetTransferred(id, newOwner, event);
      }

      console.log(`Historical sync completed. Processed ${registeredEvents.length} registrations and ${transferredEvents.length} transfers`);
    } catch (error) {
      console.error('Error syncing historical events:', error);
      throw error;
    }
  }

  /**
   * Stop listening for events
   */
  stopListening() {
    if (this.isListening) {
      this.contract.removeAllListeners();
      this.isListening = false;
      console.log('Event listener stopped');
    }
  }
}

