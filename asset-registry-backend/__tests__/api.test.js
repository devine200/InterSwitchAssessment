import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { TestAsset as Asset, TestTransfer as Transfer } from './testDb.js';
import './setup.js';

// Create a test app with the same routes as index.js
const app = express();
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Asset Registry Backend API',
    status: 'running',
    endpoints: {
      getAllAssets: 'GET /api/assets',
      getAssetTransfers: 'GET /api/assets/:assetId/transfers',
      getAssetsByOwner: 'GET /api/assets/owner/:address'
    }
  });
});

// API routes (same as index.js)
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      order: [['registeredAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets',
      message: error.message
    });
  }
});

app.get('/api/assets/:assetId/transfers', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    if (!assetId || !assetId.startsWith('0x') || assetId.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid asset ID format. Expected a hex string starting with 0x.'
      });
    }

    const transfers = await Transfer.findAll({
      where: { assetId: assetId },
      order: [['transferredAt', 'ASC']],
      include: [{
        model: Asset,
        as: 'asset',
        attributes: ['id', 'description', 'owner']
      }]
    });

    res.json({
      success: true,
      assetId: assetId,
      count: transfers.length,
      data: transfers
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers',
      message: error.message
    });
  }
});

app.get('/api/assets/owner/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format. Expected a valid Ethereum address.'
      });
    }

    const normalizedAddress = address.toLowerCase();
    const assets = await Asset.findAll({
      where: { owner: normalizedAddress },
      order: [['registeredAt', 'DESC']],
      include: [{
        model: Transfer,
        as: 'transfers',
        attributes: ['id', 'fromOwner', 'toOwner', 'blockNumber', 'transactionHash', 'transferredAt']
      }]
    });

    res.json({
      success: true,
      owner: normalizedAddress,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    console.error('Error fetching assets by owner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets by owner',
      message: error.message
    });
  }
});

describe('API Endpoints', () => {
  beforeEach(async () => {
    // Clean up before each test
    await Transfer.destroy({ where: {} });
    await Asset.destroy({ where: {} });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/assets', () => {
    it('should return empty array when no assets exist', async () => {
      const response = await request(app)
        .get('/api/assets')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        count: 0,
        data: []
      });
    });

    it('should return all assets', async () => {
      // Create test assets
      const asset1 = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset 1',
        timestamp: '1234567890',
        registeredAt: new Date('2024-01-01')
      });

      const asset2 = await Asset.create({
        id: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        owner: '0x2222222222222222222222222222222222222222',
        description: 'Test Asset 2',
        timestamp: '1234567891',
        registeredAt: new Date('2024-01-02')
      });

      const response = await request(app)
        .get('/api/assets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe(asset2.id); // Should be ordered by registeredAt DESC
      expect(response.body.data[1].id).toBe(asset1.id);
    });
  });

  describe('GET /api/assets/:assetId/transfers', () => {
    it('should return 400 for invalid asset ID format', async () => {
      const response = await request(app)
        .get('/api/assets/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid asset ID format');
    });

    it('should return empty array when no transfers exist for asset', async () => {
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const response = await request(app)
        .get(`/api/assets/${assetId}/transfers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it('should return all transfers for an asset', async () => {
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // Create asset
      await Asset.create({
        id: assetId,
        owner: '0x1111111111111111111111111111111111111111',
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date('2024-01-01')
      });

      // Create transfers
      const transfer1 = await Transfer.create({
        assetId: assetId,
        fromOwner: null,
        toOwner: '0x1111111111111111111111111111111111111111',
        blockNumber: '100',
        transactionHash: '0xtx1',
        timestamp: '1234567890',
        transferredAt: new Date('2024-01-01')
      });

      const transfer2 = await Transfer.create({
        assetId: assetId,
        fromOwner: '0x1111111111111111111111111111111111111111',
        toOwner: '0x2222222222222222222222222222222222222222',
        blockNumber: '200',
        transactionHash: '0xtx2',
        timestamp: '1234567891',
        transferredAt: new Date('2024-01-02')
      });

      const response = await request(app)
        .get(`/api/assets/${assetId}/transfers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.assetId).toBe(assetId);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].transactionHash).toBe(transfer1.transactionHash);
      expect(response.body.data[1].transactionHash).toBe(transfer2.transactionHash);
      expect(response.body.data[0].asset).toBeDefined();
    });
  });

  describe('GET /api/assets/owner/:address', () => {
    it('should return 400 for invalid address format', async () => {
      const response = await request(app)
        .get('/api/assets/owner/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid address format');
    });

    it('should return 400 for address with wrong length', async () => {
      const response = await request(app)
        .get('/api/assets/owner/0x123')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array when owner has no assets', async () => {
      const address = '0x1111111111111111111111111111111111111111';
      
      const response = await request(app)
        .get(`/api/assets/owner/${address}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it('should return assets owned by address (case insensitive)', async () => {
      const owner1 = '0x1111111111111111111111111111111111111111';
      const owner2 = '0x2222222222222222222222222222222222222222';
      
      // Create assets for owner1
      const asset1 = await Asset.create({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        owner: owner1,
        description: 'Asset 1',
        timestamp: '1234567890',
        registeredAt: new Date('2024-01-01')
      });

      const asset2 = await Asset.create({
        id: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        owner: owner1,
        description: 'Asset 2',
        timestamp: '1234567891',
        registeredAt: new Date('2024-01-02')
      });

      // Create asset for owner2
      await Asset.create({
        id: '0x9999999999999999999999999999999999999999999999999999999999999999',
        owner: owner2,
        description: 'Asset 3',
        timestamp: '1234567892',
        registeredAt: new Date('2024-01-03')
      });

      // Test with uppercase address (should normalize to lowercase)
      const response = await request(app)
        .get(`/api/assets/owner/${owner1.toUpperCase()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.owner).toBe(owner1.toLowerCase());
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map(a => a.id)).toContain(asset1.id);
      expect(response.body.data.map(a => a.id)).toContain(asset2.id);
      expect(response.body.data[0]).toHaveProperty('transfers');
    });

    it('should include transfers in response', async () => {
      const owner = '0x1111111111111111111111111111111111111111';
      const assetId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const asset = await Asset.create({
        id: assetId,
        owner: owner,
        description: 'Test Asset',
        timestamp: '1234567890',
        registeredAt: new Date('2024-01-01')
      });

      await Transfer.create({
        assetId: assetId,
        fromOwner: null,
        toOwner: owner,
        blockNumber: '100',
        transactionHash: '0xtx1',
        timestamp: '1234567890',
        transferredAt: new Date('2024-01-01')
      });

      const response = await request(app)
        .get(`/api/assets/owner/${owner}`)
        .expect(200);

      expect(response.body.data[0].transfers).toHaveLength(1);
      expect(response.body.data[0].transfers[0].transactionHash).toBe('0xtx1');
    });
  });
});

