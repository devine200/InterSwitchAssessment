import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TestEventListener as EventListener } from './testEventListener.js';
import { TestAsset as Asset, TestTransfer as Transfer } from './testDb.js';
import { AssetRegistryABI } from '../contractABI.js';
import './setup.js';

// Mock ethers
const mockProvider = {
  getBlock: jest.fn(),
};

const mockContract = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  filters: {
    AssetRegistered: jest.fn(),
    AssetTransferred: jest.fn(),
  },
  queryFilter: jest.fn(),
};

// Note: We're not mocking ethers since TestEventListener accepts provider and contract

describe('EventListener', () => {
  const contractAddress = '0x1234567890123456789012345678901234567890';
  const rpcUrl = 'https://test.rpc.url';
  
  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockProvider.getBlock.mockResolvedValue({ timestamp: 1234567890 });
    
    // Clean database
    await Transfer.destroy({ where: {} });
    await Asset.destroy({ where: {} });
  });

  describe('Constructor', () => {
    it('should initialize with contract address, RPC URL, and ABI', () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      expect(listener.contractAddress).toBe(contractAddress);
      expect(listener.isListening).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should start listening for events', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      await listener.startListening();
      
      expect(listener.isListening).toBe(true);
      expect(mockContract.on).toHaveBeenCalledWith('AssetRegistered', expect.any(Function));
      expect(mockContract.on).toHaveBeenCalledWith('AssetTransferred', expect.any(Function));
    });

    it('should not start listening if already listening', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      listener.isListening = true;
      
      await listener.startListening();
      
      expect(mockContract.on).not.toHaveBeenCalled();
    });
  });

  describe('handleAssetRegistered', () => {
    it('should create a new asset in database', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const owner = '0x1111111111111111111111111111111111111111';
      const description = 'Test Asset';
      const timestamp = '1234567890';
      
      const mockEvent = {
        log: {
          transactionHash: '0xtxhash123',
          blockNumber: 100,
        },
      };

      await listener.handleAssetRegistered(assetId, owner, description, timestamp, mockEvent);

      const asset = await Asset.findByPk(assetId);
      expect(asset).toBeDefined();
      expect(asset.owner).toBe(owner.toLowerCase());
      expect(asset.description).toBe(description);
      expect(asset.timestamp).toBe(timestamp);
    });

    it('should not create duplicate assets', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const owner = '0x1111111111111111111111111111111111111111';
      const description = 'Test Asset';
      const timestamp = '1234567890';
      
      const mockEvent = {
        log: {
          transactionHash: '0xtxhash123',
          blockNumber: 100,
        },
      };

      // Create asset first time
      await listener.handleAssetRegistered(assetId, owner, description, timestamp, mockEvent);
      
      // Try to create again
      await listener.handleAssetRegistered(assetId, owner, description, timestamp, mockEvent);

      const assets = await Asset.findAll({ where: { id: assetId } });
      expect(assets).toHaveLength(1);
    });

    it('should create initial transfer record', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const owner = '0x1111111111111111111111111111111111111111';
      const description = 'Test Asset';
      const timestamp = '1234567890';
      
      const mockEvent = {
        log: {
          transactionHash: '0xtxhash123',
          blockNumber: 100,
        },
      };

      await listener.handleAssetRegistered(assetId, owner, description, timestamp, mockEvent);

      const transfer = await Transfer.findOne({
        where: { transactionHash: '0xtxhash123' },
      });
      
      expect(transfer).toBeDefined();
      expect(transfer.assetId).toBe(assetId);
      expect(transfer.fromOwner).toBeNull();
      expect(transfer.toOwner).toBe(owner.toLowerCase());
      expect(transfer.blockNumber).toBe('100');
    });

    it('should handle event structure without log property', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const owner = '0x1111111111111111111111111111111111111111';
      const description = 'Test Asset';
      const timestamp = '1234567890';
      
      const mockEvent = {
        transactionHash: '0xtxhash456',
        blockNumber: 200,
      };

      await listener.handleAssetRegistered(assetId, owner, description, timestamp, mockEvent);

      const transfer = await Transfer.findOne({
        where: { transactionHash: '0xtxhash456' },
      });
      
      expect(transfer).toBeDefined();
    });
  });

  describe('handleAssetTransferred', () => {
    it('should update asset owner and create transfer record', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const oldOwner = '0x1111111111111111111111111111111111111111';
      const newOwner = '0x2222222222222222222222222222222222222222';
      
      // Create existing asset
      await Asset.create({
        id: assetId,
        owner: oldOwner,
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const mockEvent = {
        log: {
          transactionHash: '0xtxhash789',
          blockNumber: 300,
        },
      };

      await listener.handleAssetTransferred(assetId, newOwner, mockEvent);

      const asset = await Asset.findByPk(assetId);
      expect(asset.owner).toBe(newOwner.toLowerCase());

      const transfer = await Transfer.findOne({
        where: { transactionHash: '0xtxhash789' },
      });
      
      expect(transfer).toBeDefined();
      expect(transfer.fromOwner).toBe(oldOwner);
      expect(transfer.toOwner).toBe(newOwner.toLowerCase());
    });

    it('should get block timestamp for transfer', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const oldOwner = '0x1111111111111111111111111111111111111111';
      const newOwner = '0x2222222222222222222222222222222222222222';
      
      await Asset.create({
        id: assetId,
        owner: oldOwner,
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const blockNumber = 300;
      mockProvider.getBlock.mockResolvedValue({ timestamp: 9876543210 });

      const mockEvent = {
        log: {
          transactionHash: '0xtxhash999',
          blockNumber: blockNumber,
        },
      };

      await listener.handleAssetTransferred(assetId, newOwner, mockEvent);

      expect(mockProvider.getBlock).toHaveBeenCalledWith(blockNumber);

      const transfer = await Transfer.findOne({
        where: { transactionHash: '0xtxhash999' },
      });
      
      expect(transfer.timestamp).toBe('9876543210');
    });

    it('should handle missing asset gracefully', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x9999999999999999999999999999999999999999999999999999999999999999';
      const newOwner = '0x2222222222222222222222222222222222222222';
      
      const mockEvent = {
        log: {
          transactionHash: '0xtxhash000',
          blockNumber: 400,
        },
      };

      // Should not throw error
      await expect(
        listener.handleAssetTransferred(assetId, newOwner, mockEvent)
      ).resolves.not.toThrow();
    });
  });

  describe('syncHistoricalEvents', () => {
    it('should sync AssetRegistered events', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const owner = '0x1111111111111111111111111111111111111111';
      const description = 'Test Asset';
      const timestamp = '1234567890';
      
      const mockEvent = {
        args: [assetId, owner, description, timestamp],
        log: {
          transactionHash: '0xtxhash123',
          blockNumber: 100,
        },
      };

      mockContract.filters.AssetRegistered.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValueOnce([mockEvent]);
      mockContract.queryFilter.mockResolvedValueOnce([]);

      await listener.syncHistoricalEvents(0);

      const asset = await Asset.findByPk(assetId);
      expect(asset).toBeDefined();
      expect(mockContract.queryFilter).toHaveBeenCalled();
    });

    it('should sync AssetTransferred events', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const oldOwner = '0x1111111111111111111111111111111111111111';
      const newOwner = '0x2222222222222222222222222222222222222222';
      
      // Create asset first
      await Asset.create({
        id: assetId,
        owner: oldOwner,
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const mockEvent = {
        args: [assetId, newOwner],
        log: {
          transactionHash: '0xtxhash456',
          blockNumber: 200,
        },
      };

      mockContract.filters.AssetRegistered.mockReturnValue({});
      mockContract.filters.AssetTransferred.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValueOnce([]);
      mockContract.queryFilter.mockResolvedValueOnce([mockEvent]);

      await listener.syncHistoricalEvents(0);

      const asset = await Asset.findByPk(assetId);
      expect(asset.owner).toBe(newOwner.toLowerCase());
    });

    it('should handle errors during sync', async () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      
      mockContract.filters.AssetRegistered.mockReturnValue({});
      mockContract.queryFilter.mockRejectedValue(new Error('RPC Error'));

      await expect(listener.syncHistoricalEvents(0)).rejects.toThrow('RPC Error');
    });
  });

  describe('stopListening', () => {
    it('should stop listening and remove all listeners', () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      listener.isListening = true;
      
      listener.stopListening();
      
      expect(listener.isListening).toBe(false);
      expect(mockContract.removeAllListeners).toHaveBeenCalled();
    });

    it('should not do anything if not listening', () => {
      const listener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI, mockProvider, mockContract);
      listener.isListening = false;
      
      listener.stopListening();
      
      expect(mockContract.removeAllListeners).not.toHaveBeenCalled();
    });
  });
});

