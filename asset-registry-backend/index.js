import express from 'express';
import { sequelize, Asset, Transfer } from './db.js';
import { EventListener } from './eventListener.js';
import { AssetRegistryABI } from './contractABI.js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global event listener instance (will be initialized later)
let eventListener = null;

// Middleware to parse JSON
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Asset Registry Backend API',
    status: 'running',
      endpoints: {
      getAllAssets: 'GET /api/assets',
      getAllTransfers: 'GET /api/transfers',
      getAssetTransfers: 'GET /api/assets/:assetId/transfers',
      getAssetsByOwner: 'GET /api/assets/owner/:address',
      getRecentEvents: 'GET /api/events/recent?blocks=1000',
      searchEvents: 'GET /api/events/search?assetId=&owner=&startDate=&endDate='
    }
  });
});

/**
 * GET /api/transfers
 * Fetch all transfers
 */
app.get('/api/transfers', async (req, res) => {
  try {
    const transfers = await Transfer.findAll({
      order: [['transferredAt', 'ASC']],
      include: [{
        model: Asset,
        as: 'asset',
        attributes: ['id', 'description', 'owner']
      }]
    });
    
    res.json({
      success: true,
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

/**
 * GET /api/assets
 * Fetch all registered assets
 */
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

/**
 * GET /api/assets/:assetId/transfers
 * Fetch all transfers for a given asset ID
 */
app.get('/api/assets/:assetId/transfers', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Validate assetId format (should be a hex string)
    // bytes32 can be 0x + 64 hex characters, but we'll be flexible
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

/**
 * GET /api/assets/owner/:address
 * Fetch all assets owned by a given address
 */
app.get('/api/assets/owner/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format (should be a valid Ethereum address)
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

/**
 * GET /api/events/recent
 * Fetch all events (assets and transfers) from the last N blocks
 */
app.get('/api/events/recent', async (req, res) => {
  try {
    const blocks = parseInt(req.query.blocks) || 1000;
    
    // Get current block number from provider if available
    let currentBlock = null;
    if (eventListener && eventListener.provider) {
      try {
        currentBlock = await eventListener.provider.getBlockNumber();
      } catch (error) {
        console.warn('Could not fetch current block number:', error);
      }
    }
    
    // If we can't get current block, use the highest block number in transfers
    if (!currentBlock) {
      const latestTransfer = await Transfer.findOne({
        order: [['blockNumber', 'DESC']],
        attributes: ['blockNumber']
      });
      currentBlock = latestTransfer ? parseInt(latestTransfer.blockNumber) : 0;
    }
    
    const fromBlock = Math.max(0, currentBlock - blocks);
    
    // Get assets registered in this block range
    const assets = await Asset.findAll({
      include: [{
        model: Transfer,
        as: 'transfers',
        where: {
          blockNumber: {
            [Op.gte]: fromBlock.toString()
          }
        },
        required: false
      }],
      order: [['registeredAt', 'DESC']]
    });
    
    // Get transfers in this block range
    const transfers = await Transfer.findAll({
      where: {
        blockNumber: {
          [Op.gte]: fromBlock.toString(),
          [Op.lte]: currentBlock.toString()
        }
      },
      include: [{
        model: Asset,
        as: 'asset',
        attributes: ['id', 'description', 'owner']
      }],
      order: [['blockNumber', 'ASC']]
    });
    
    res.json({
      success: true,
      blockRange: {
        from: fromBlock,
        to: currentBlock,
        blocks: currentBlock - fromBlock
      },
      assets: {
        count: assets.length,
        data: assets
      },
      transfers: {
        count: transfers.length,
        data: transfers
      }
    });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent events',
      message: error.message
    });
  }
});

/**
 * GET /api/events/search
 * Search events by Asset ID, Owner address, and/or Date range
 */
app.get('/api/events/search', async (req, res) => {
  try {
    const { assetId, owner, startDate, endDate } = req.query;
    
    // Build where clause for transfers
    const transferWhere = {};
    const assetWhere = {};
    
    if (assetId) {
      if (!assetId.startsWith('0x')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid asset ID format. Expected a hex string starting with 0x.'
        });
      }
      transferWhere.assetId = assetId;
      assetWhere.id = assetId;
    }
    
    if (owner) {
      if (owner.length !== 42 || !owner.startsWith('0x')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid address format. Expected a valid Ethereum address.'
        });
      }
      const normalizedOwner = owner.toLowerCase();
      transferWhere[Op.or] = [
        { fromOwner: normalizedOwner },
        { toOwner: normalizedOwner }
      ];
      assetWhere.owner = normalizedOwner;
    }
    
    if (startDate || endDate) {
      transferWhere.transferredAt = {};
      if (startDate) {
        transferWhere.transferredAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        transferWhere.transferredAt[Op.lte] = new Date(endDate);
      }
    }
    
    // Fetch transfers matching criteria
    const transfers = await Transfer.findAll({
      where: transferWhere,
      include: [{
        model: Asset,
        as: 'asset',
        attributes: ['id', 'description', 'owner']
      }],
      order: [['transferredAt', 'DESC']]
    });
    
    // Fetch assets matching criteria (if assetId or owner specified)
    let assets = [];
    if (assetId || owner) {
      assets = await Asset.findAll({
        where: assetWhere,
        include: [{
          model: Transfer,
          as: 'transfers',
          attributes: ['id', 'fromOwner', 'toOwner', 'blockNumber', 'transactionHash', 'transferredAt']
        }],
        order: [['registeredAt', 'DESC']]
      });
    }
    
    res.json({
      success: true,
      query: {
        assetId: assetId || null,
        owner: owner || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      results: {
        transfers: {
          count: transfers.length,
          data: transfers
        },
        assets: {
          count: assets.length,
          data: assets
        }
      }
    });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search events',
      message: error.message
    });
  }
});

// Initialize database and start server

sequelize.sync({ alter: true }).then(async () => {
  console.log('Database connected and synced');
  
  // Start event listener if contract address and RPC URL are provided
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const rpcUrl = process.env.RPC_URL;
  const syncFromBlock = process.env.SYNC_FROM_BLOCK || 0;

  if (contractAddress && rpcUrl) {
    try {
      eventListener = new EventListener(contractAddress, rpcUrl, AssetRegistryABI);
      
      // Sync historical events first
      if (syncFromBlock > 0) {
        console.log(`Syncing historical events from block ${syncFromBlock}...`);
        await eventListener.syncHistoricalEvents(parseInt(syncFromBlock));
      }
      
      // Start listening for new events
      await eventListener.startListening();
      console.log('Event listener initialized and running');
    } catch (error) {
      console.error('Error initializing event listener:', error);
      console.warn('Server will start without event listener. Make sure CONTRACT_ADDRESS and RPC_URL are set in .env');
    }
  } else {
    console.warn('CONTRACT_ADDRESS or RPC_URL not set. Event listener will not start.');
    console.warn('To enable event listening, set these variables in your .env file.');
  }

  // Start the Express server
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
  });
}).catch((error) => {
  console.error('Unable to connect to the database:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (eventListener) {
    eventListener.stopListening();
  }
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  if (eventListener) {
    eventListener.stopListening();
  }
  await sequelize.close();
  process.exit(0);
});