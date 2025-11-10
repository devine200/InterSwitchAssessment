const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ZeroAddress } = require("ethers");

describe("AssetRegistry", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAssetRegistryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    const assetRegistry = await AssetRegistry.deploy();

    return { assetRegistry, owner, otherAccount };
  }


  const getAssetId = async (receipt) => {
    const event = receipt.logs.find(e=> e.fragment.name === "AssetRegistered");
    return event.args.id;
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { assetRegistry, owner } = await loadFixture(deployAssetRegistryFixture);

      expect(await assetRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("Asset Registration", async function () {
    const block = await ethers.provider.getBlock("latest")

    describe("Registering an asset", function () {
      it("Should not be reverted with error if called from any account", async function () {
        const { assetRegistry, otherAccount } = await loadFixture(deployAssetRegistryFixture);
        
        await expect(assetRegistry.registerNewAsset("Test Asset1")).to.not.be.reverted;
        await expect(assetRegistry.registerNewAsset("Test Asset1")).to.emit(assetRegistry, "AssetRegistered");

        await expect(assetRegistry.connect(otherAccount).registerNewAsset("Test Asset2")).to.not.be.reverted;
        await expect(assetRegistry.connect(otherAccount).registerNewAsset("Test Asset2")).to.emit(assetRegistry, "AssetRegistered");
      });
    });

    describe("Getting an asset", function () {

      it("Should return the asset", async function () {
        const { assetRegistry, owner } = await loadFixture(deployAssetRegistryFixture);
        const assetDescription = "Test Asset";
        const assetRegistryTx = await assetRegistry.registerNewAsset(assetDescription);
        const receipt = await assetRegistryTx.wait();
        const assetId = getAssetId(receipt);

        const asset = await assetRegistry.getAsset(assetId);
        expect(asset.owner).to.equal(owner.address);
        expect(asset.description).to.equal(assetDescription);
      });

      it("Should return the asset by owner", async function () {
        const { assetRegistry, owner } = await loadFixture(deployAssetRegistryFixture);
        const newAssetDescription = "new asset";
        await expect(assetRegistry.registerNewAsset(newAssetDescription)).to.not.be.reverted;

        const assets = await assetRegistry.getAssetsByOwner(owner.address);
        expect(assets.length).to.equal(1);
        expect(assets[0].description).to.equal(newAssetDescription);
      });
    });

    describe("Transferring an asset", function () {
      it("Should transfer the asset to the new owner", async function () {
        const { assetRegistry, owner, otherAccount } = await loadFixture(deployAssetRegistryFixture);
        const assetDescription = "Test Asset";
        const assetRegistryTx = await assetRegistry.registerNewAsset(assetDescription);
        const receipt = await assetRegistryTx.wait();
        const assetId = getAssetId(receipt);

        await expect(assetRegistry.transferAsset(assetId, otherAccount.address)).to.emit(assetRegistry, "AssetTransferred");
        const asset = await assetRegistry.getAsset(assetId);
        expect(asset.owner).to.equal(otherAccount.address);
      });
      it("Should revert with error if not the owner", async function () {
        const { assetRegistry, otherAccount } = await loadFixture(deployAssetRegistryFixture);
        const assetDescription = "Test Asset";
        const assetRegistryTx = await assetRegistry.connect(otherAccount).registerNewAsset(assetDescription);
        const receipt = await assetRegistryTx.wait();
        const assetId = getAssetId(receipt);
        await expect(assetRegistry.transferAsset(assetId, otherAccount.address)).to.be.revertedWith("You are not the owner of this asset");
      });
      it("Should revert with error if new owner is the zero address", async function () {
        const { assetRegistry } = await loadFixture(deployAssetRegistryFixture);
        const assetDescription = "Test Asset";
        const assetRegistryTx = await assetRegistry.registerNewAsset(assetDescription);
        const receipt = await assetRegistryTx.wait();
        const assetId = getAssetId(receipt);
        await expect(assetRegistry.transferAsset(assetId, ZeroAddress)).to.be.revertedWith("New owner cannot be the zero address");
      });
      it("Should revert with error if new owner is the same as the current owner", async function () {
        const { assetRegistry, owner } = await loadFixture(deployAssetRegistryFixture);
        const assetDescription = "Test Asset";
        const assetRegistryTx = await assetRegistry.registerNewAsset(assetDescription);
        const receipt = await assetRegistryTx.wait();
        const assetId = getAssetId(receipt);
        await expect(assetRegistry.transferAsset(assetId, owner.address)).to.be.revertedWith("New owner cannot be the same as the current owner");
      });
    });

  });
});
