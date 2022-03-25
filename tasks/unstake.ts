import { task } from "hardhat/config";

task("unstake", "Unstakes tokens")
  .addParam("contractaddr", "The contract address")
  .addParam("amount", "The amount of tokens to transfer")
  .setAction(async ({ contractaddr: contractAddress, amount }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const staking = await hre.ethers.getContractAt("Staking", contractAddress);
    const value = hre.ethers.utils.parseUnits(amount);

    await staking.unstake(value);

    console.log(`Unstaked ${amount} of tokens to address ${signer.address}`);
  });
