import { ethers } from "hardhat";

async function main() {
  const stakingContractFactory = await ethers.getContractFactory("Staking");
  // const stakingContract = await stakingContractFactory.deploy();
  //
  // await stakingContract.deployed();
  //
  // console.log("Staking contract deployed to:", stakingContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
