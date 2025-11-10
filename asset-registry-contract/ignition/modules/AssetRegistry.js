// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://v2.hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AssetRegistryModule", (m) => {
  const assetRegistry = m.contract("AssetRegistry", []);

  return { assetRegistry };
});
