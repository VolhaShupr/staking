import { task } from "hardhat/config";

task("claim", "Claim reward tokens")
  .addParam("contractaddr", "The contract address")
  .setAction(async ({ contractaddr: contractAddress, amount }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const staking = await hre.ethers.getContractAt("Staking", contractAddress);

    await staking.claim();

    console.log(`Claimed rewards to address ${signer.address}`);
  });
