import { Sequelize, DataTypes } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false
});

// Asset model matching the smart contract structure
export const Asset = sequelize.define("Asset", {
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

// Transfer model to track asset transfers
export const Transfer = sequelize.define("Transfer", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assetId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Asset,
      key: 'id'
    }
  },
  fromOwner: {
    type: DataTypes.STRING,
    allowNull: true // null for initial registration
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
Asset.hasMany(Transfer, { foreignKey: 'assetId', as: 'transfers' });
Transfer.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
