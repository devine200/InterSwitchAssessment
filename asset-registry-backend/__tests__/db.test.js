import { describe, it, expect, beforeEach } from '@jest/globals';
import { TestAsset as Asset, TestTransfer as Transfer } from './testDb.js';
import './setup.js';

describe('Database Models', () => {
  beforeEach(async () => {
    await Transfer.destroy({ where: {} });
    await Asset.destroy({ where: {} });
  });

  describe('Asset Model', () => {
    it('should create an asset with all required fields', async () => {
      const assetData = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset Description',
        timestamp: '1234567890',
        registeredAt: new Date('2024-01-01'),
      };

      const asset = await Asset.create(assetData);

      expect(asset.id).toBe(assetData.id);
      expect(asset.owner).toBe(assetData.owner);
      expect(asset.description).toBe(assetData.description);
      expect(asset.timestamp).toBe(assetData.timestamp);
      expect(asset.registeredAt).toBeInstanceOf(Date);
    });

    it('should not allow duplicate asset IDs', async () => {
      const assetData = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      };

      await Asset.create(assetData);

      await expect(Asset.create(assetData)).rejects.toThrow();
    });

    it('should require all required fields', async () => {
      await expect(
        Asset.create({
          id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          // Missing owner, description, timestamp
        })
      ).rejects.toThrow();
    });

    it('should find asset by primary key', async () => {
      const assetData = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      };

      await Asset.create(assetData);
      const foundAsset = await Asset.findByPk(assetData.id);

      expect(foundAsset).toBeDefined();
      expect(foundAsset.id).toBe(assetData.id);
    });

    it('should update asset owner', async () => {
      const assetData = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      };

      const asset = await Asset.create(assetData);
      asset.owner = '0x2222222222222222222222222222222222222222';
      await asset.save();

      const updatedAsset = await Asset.findByPk(assetData.id);
      expect(updatedAsset.owner).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('Transfer Model', () => {
    it('should create a transfer with all required fields', async () => {
      // Create asset first
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transferData = {
        assetId: asset.id,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtxhash123',
        timestamp: '1234567890',
        transferredAt: new Date('2024-01-01'),
      };

      const transfer = await Transfer.create(transferData);

      expect(transfer.assetId).toBe(asset.id);
      expect(transfer.fromOwner).toBeNull();
      expect(transfer.toOwner).toBe(transferData.toOwner);
      expect(transfer.blockNumber).toBe(transferData.blockNumber);
      expect(transfer.transactionHash).toBe(transferData.transactionHash);
      expect(transfer.timestamp).toBe(transferData.timestamp);
    });

    it('should not allow duplicate transaction hashes', async () => {
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transferData = {
        assetId: asset.id,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtxhash123',
        timestamp: '1234567890',
        transferredAt: new Date(),
      };

      await Transfer.create(transferData);

      await expect(Transfer.create(transferData)).rejects.toThrow();
    });

    it('should allow null fromOwner for initial registration', async () => {
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transfer = await Transfer.create({
        assetId: asset.id,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtxhash123',
        timestamp: '1234567890',
        transferredAt: new Date(),
      });

      expect(transfer.fromOwner).toBeNull();
    });

    it('should create transfer with fromOwner for subsequent transfers', async () => {
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transfer = await Transfer.create({
        assetId: asset.id,
        fromOwner: '0x1111111111111111111111111111111111111111',
        toOwner: '0x2222222222222222222222222222222222222222',
        blockNumber: '200',
        transactionHash: '0xtxhash456',
        timestamp: '1234567891',
        transferredAt: new Date(),
      });

      expect(transfer.fromOwner).toBe('0x1111111111111111111111111111111111111111');
      expect(transfer.toOwner).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('Model Associations', () => {
    it('should associate asset with transfers', async () => {
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transfer1 = await Transfer.create({
        assetId: asset.id,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtxhash1',
        timestamp: '1234567890',
        transferredAt: new Date(),
      });

      const transfer2 = await Transfer.create({
        assetId: asset.id,
        fromOwner: '0x1111111111111111111111111111111111111111',
        toOwner: '0x2222222222222222222222222222222222222222',
        blockNumber: '200',
        transactionHash: '0xtxhash2',
        timestamp: '1234567891',
        transferredAt: new Date(),
      });

      const assetWithTransfers = await Asset.findByPk(asset.id, {
        include: [{ model: Transfer, as: 'transfers' }],
      });

      expect(assetWithTransfers.transfers).toHaveLength(2);
      expect(assetWithTransfers.transfers.map(t => t.id)).toContain(transfer1.id);
      expect(assetWithTransfers.transfers.map(t => t.id)).toContain(transfer2.id);
    });

    it('should associate transfer with asset', async () => {
      const asset = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date(),
      });

      const transfer = await Transfer.create({
        assetId: asset.id,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtxhash123',
        timestamp: '1234567890',
        transferredAt: new Date(),
      });

      const transferWithAsset = await Transfer.findByPk(transfer.id, {
        include: [{ model: Asset, as: 'asset' }],
      });

      expect(transferWithAsset.asset).toBeDefined();
      expect(transferWithAsset.asset.id).toBe(asset.id);
      expect(transferWithAsset.asset.description).toBe(asset.description);
    });
  });
});

