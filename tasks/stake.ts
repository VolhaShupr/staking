import { task } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const LP_TOKEN_ADDRESS = process.env.LP_TOKEN_ADDRESS as string;

task("stake", "Stakes tokens")
  .addParam("contractaddr", "The contract address")
  .addParam("amount", "The amount of tokens to transfer")
  .setAction(async ({ contractaddr: contractAddress, amount }, hre) => {
    const [signer] = await hre.ethers.getSigners();

    const staking = await hre.ethers.getContractAt("Staking", contractAddress);
    const lpToken = await hre.ethers.getContractAt("Token", LP_TOKEN_ADDRESS);

    const decimals = await lpToken.decimals();
    const symbol = await lpToken.symbol();
    const value = hre.ethers.utils.parseUnits(amount, decimals);

    await lpToken.approve(staking.address, value);
    console.log(`Approved for staking contract usage ${amount} ${symbol} tokens`);

    await staking.stake(value);

    console.log(`Staked ${amount} ${symbol} tokens from address ${signer.address}`);
  });
