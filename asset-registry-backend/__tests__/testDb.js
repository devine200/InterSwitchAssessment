import { Sequelize, DataTypes } from 'sequelize';

// Create in-memory test database
export const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Re-define models for testing with in-memory database
export const TestAsset = testSequelize.define('Asset', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  owner: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  registeredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

export const TestTransfer = testSequelize.define('Transfer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assetId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: TestAsset,
      key: 'id'
    }
  },
  fromOwner: {
    type: DataTypes.STRING,
    allowNull: true
  },
  toOwner: {
    type: DataTypes.STRING,
    allowNull: false
  },
  blockNumber: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  timestamp: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  transferredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

// Define associations
TestAsset.hasMany(TestTransfer, { foreignKey: 'assetId', as: 'transfers' });
TestTransfer.belongsTo(TestAsset, { foreignKey: 'assetId', as: 'asset' });

