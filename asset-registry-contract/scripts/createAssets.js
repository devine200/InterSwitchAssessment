const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x4de8A863f6FCa76498D26BE85Ff1323F5E01A6c2";
  const [signer] = await ethers.getSigners();
  
  console.log("Creating assets with account:", signer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH");
  
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.attach(contractAddress);
  
  // Asset descriptions to register
  const assetDescriptions = [
    "Digital Art Collection #001 - Abstract Composition",
    "Real Estate Token - Downtown Office Building",
    "Intellectual Property - Software Patent #2024-001",
    "Collectible NFT - Rare Vintage Car",
    "Commodity Certificate - Gold Reserve"
  ];
  
  console.log("\nRegistering assets...\n");
  
  for (let i = 0; i < assetDescriptions.length; i++) {
    try {
      console.log(`Registering asset ${i + 1}/${assetDescriptions.length}: ${assetDescriptions[i]}`);
      const tx = await assetRegistry.registerNewAsset(assetDescriptions[i]);
      console.log(`  Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  Transaction confirmed in block: ${receipt.blockNumber}`);
      
      // Extract asset ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = assetRegistry.interface.parseLog(log);
          return parsed && parsed.name === "AssetRegistered";
        } catch (e) {
          return false;
        }
      });
      
      if (event) {
        const parsed = assetRegistry.interface.parseLog(event);
        const assetId = parsed.args.id;
        console.log(`  Asset ID: ${assetId}`);
        console.log(`  Owner: ${parsed.args.owner}`);
        console.log(`  Timestamp: ${new Date(Number(parsed.args.timestamp) * 1000).toISOString()}\n`);
      }
    } catch (error) {
      console.error(`  Error registering asset ${i + 1}:`, error.message);
    }
  }
  
  console.log("\nAll assets registered successfully!");
  
  // Get all assets by owner
  const ownerAssets = await assetRegistry.getAssetsByOwner(signer.address);
  console.log(`\nTotal assets owned by ${signer.address}: ${ownerAssets.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

