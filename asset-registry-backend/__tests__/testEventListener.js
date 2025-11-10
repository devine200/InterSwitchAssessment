import { ethers } from 'ethers';
import { TestAsset as Asset, TestTransfer as Transfer } from './testDb.js';

/**
 * Test version of EventListener that uses test database models
 */
export class TestEventListener {
  constructor(contractAddress, rpcUrl, contractABI, provider, contract) {
    this.contractAddress = contractAddress;
    this.provider = provider;
    this.contract = contract;
    this.isListening = false;
  }

  async startListening() {
    if (this.isListening) {
      console.log('Event listener is already running');
      return;
    }

    this.isListening = true;
    console.log(`Starting event listener for contract at ${this.contractAddress}`);

    this.contract.on('AssetRegistered', async (id, owner, description, timestamp, event) => {
      try {
        await this.handleAssetRegistered(id, owner, description, timestamp, event);
      } catch (error) {
        console.error('Error handling AssetRegistered event:', error);
      }
    });

    this.contract.on('AssetTransferred', async (id, newOwner, event) => {
      try {
        await this.handleAssetTransferred(id, newOwner, event);
      } catch (error) {
        console.error('Error handling AssetTransferred event:', error);
      }
    });

    console.log('Event listener started successfully');
  }

  async handleAssetRegistered(id, owner, description, timestamp, event) {
    const assetId = id.toString();
    const ownerAddress = owner.toLowerCase();
    const timestampValue = timestamp.toString();

    console.log(`AssetRegistered: ${assetId} by ${ownerAddress}`);

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
          fromOwner: null,
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

  async handleAssetTransferred(id, newOwner, event) {
    const assetId = id.toString();
    const newOwnerAddress = newOwner.toLowerCase();

    console.log(`AssetTransferred: ${assetId} to ${newOwnerAddress}`);

    const asset = await Asset.findByPk(assetId);
    if (asset) {
      const previousOwner = asset.owner;
      asset.owner = newOwnerAddress;
      await asset.save();

      const log = event.log || event;
      const transferHash = log.transactionHash || log.hash;
      const blockNumber = log.blockNumber;
      
      if (transferHash && blockNumber) {
        const existingTransfer = await Transfer.findOne({
          where: { transactionHash: transferHash }
        });

        if (!existingTransfer) {
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

  async syncHistoricalEvents(fromBlock = 0) {
    console.log(`Syncing historical events from block ${fromBlock}`);
    
    try {
      const registeredFilter = this.contract.filters.AssetRegistered();
      const registeredEvents = await this.contract.queryFilter(registeredFilter, fromBlock);

      for (const event of registeredEvents) {
        const [id, owner, description, timestamp] = event.args;
        await this.handleAssetRegistered(id, owner, description, timestamp, event);
      }

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

  stopListening() {
    if (this.isListening) {
      this.contract.removeAllListeners();
      this.isListening = false;
      console.log('Event listener stopped');
    }
  }
}

