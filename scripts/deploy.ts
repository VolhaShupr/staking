import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const { LP_TOKEN_ADDRESS, REWARD_TOKEN_ADDRESS } = process.env;

async function main() {
  const lpToken = LP_TOKEN_ADDRESS || "";
  const rewardToken = REWARD_TOKEN_ADDRESS || "";

  const stakingContractFactory = await ethers.getContractFactory("Staking");
  const stakingContract = await stakingContractFactory.deploy(lpToken, rewardToken);

  await stakingContract.deployed();

  console.log("Staking contract deployed to: ", stakingContract.address);
  console.log("LP token address: ", lpToken);
  console.log("Reward token address: ", rewardToken);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
