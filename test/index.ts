import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const REWARD_RATE = 20; // 20 %
const REWARD_FREEZE_MIN = 10; // 10 min
const UNSTAKE_FREEZE_MIN = 20; // 20 min

const toBigNumber = (amount: number): BigNumber => ethers.utils.parseUnits(amount.toString());
async function increaseTime(min: number) {
  const seconds = min * 60;
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

const getReward = (amount: BigNumber, rate = REWARD_RATE): BigNumber => amount.mul(rate).div(100);

interface Stake {
  lastStakeDate: number;
  staked: BigNumber;
  availableReward: BigNumber;
  frozenReward: BigNumber;
}

describe("Staking", () => {
  const tokenInitialSupply = toBigNumber(100);
  const stakingTokenOwnerAllowance = toBigNumber(90);
  const rewardTokenContractBalance = toBigNumber(90);

  let stakingContract: Contract,
    stakingToken: Contract,
    rewardToken: Contract,
    owner: SignerWithAddress,
    delegate: SignerWithAddress,
    account1: SignerWithAddress;

  let actualStake: Stake = {
    lastStakeDate: new Date().getTime(), // field is not in use in tests
    staked: toBigNumber(0),
    availableReward: toBigNumber(0),
    frozenReward: toBigNumber(0),
  };

  let clean: any; // snapshot

  before(async () => {
    [owner, delegate, account1] = await ethers.getSigners();

    const tokenContractFactory = await ethers.getContractFactory("Token");
    stakingToken = await tokenContractFactory.deploy("LP Token", "LPT", tokenInitialSupply);
    await stakingToken.deployed();

    rewardToken = await tokenContractFactory.deploy("Reward Token", "REWT", 0);
    await rewardToken.deployed();

    const stakingContractFactory = await ethers.getContractFactory("Staking");
    stakingContract = await stakingContractFactory.deploy(stakingToken.address, rewardToken.address);
    await stakingContract.deployed();

    await stakingToken.approve(stakingContract.address, stakingTokenOwnerAllowance);
    await rewardToken.mint(stakingContract.address, rewardTokenContractBalance);

    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });

  afterEach(async () => {
    await network.provider.request({ method: "evm_revert", params: [clean] });
    clean = await network.provider.request({ method: "evm_snapshot", params: [] });

    actualStake = {
      ...actualStake,
      staked: toBigNumber(0),
      availableReward: toBigNumber(0),
      frozenReward: toBigNumber(0),
    };
  });

  async function testStakeValues() {
    const expectedStake: Stake = await stakingContract.stakeBalanceOfSender();

    expect(expectedStake.staked).to.equal(actualStake.staked);
    expect(expectedStake.availableReward).to.equal(actualStake.availableReward);
    expect(expectedStake.frozenReward).to.equal(actualStake.frozenReward);
  }

  it("Should stake specified amount of sender's tokens", async () => {
    await expect(stakingContract.stake(0)).to.be.revertedWith("Not valid amount");

    const value = toBigNumber(40);
    let stakingTokenOwnerBalance = tokenInitialSupply;

    await expect(stakingContract.stake(value))
      .to.emit(stakingContract, "Stake")
      .withArgs(owner.address, value);

    stakingTokenOwnerBalance = stakingTokenOwnerBalance.sub(value.div(1));
    actualStake = {
      ...actualStake,
      staked: value,
      frozenReward: getReward(value),
    };

    expect(await stakingToken.balanceOf(owner.address)).to.equal(stakingTokenOwnerBalance);
    await testStakeValues();

    await increaseTime(9);

    // <not enough time for unfreezing reward> later
    const value1 = toBigNumber(20);
    await stakingContract.stake(value1);

    stakingTokenOwnerBalance = stakingTokenOwnerBalance.sub(value1.div(1));
    actualStake = {
      ...actualStake,
      staked: actualStake.staked.add(value1),
      frozenReward: actualStake.frozenReward.add(getReward(value1)),
    };

    expect(await stakingToken.balanceOf(owner.address)).to.equal(stakingTokenOwnerBalance);
    await testStakeValues();

    await increaseTime(11);

    // <enough time for unfreezing reward> later
    const value2 = toBigNumber(30);
    await stakingContract.stake(value2);

    stakingTokenOwnerBalance = stakingTokenOwnerBalance.sub(value2.div(1));
    actualStake = {
      ...actualStake,
      availableReward: getReward(actualStake.staked),
      staked: actualStake.staked.add(value2),
      frozenReward: getReward(value2),
    };

    expect(await stakingToken.balanceOf(owner.address)).to.equal(stakingTokenOwnerBalance);
    await testStakeValues();
  });

  it("Should unstake specified amount of tokens and transfer them to sender's account", async () => {
    await expect(stakingContract.unstake(0)).to.be.revertedWith("Not valid amount");

    const stakedValue = toBigNumber(40);
    await stakingContract.stake(stakedValue);

    await increaseTime(UNSTAKE_FREEZE_MIN - 1);

    // <not enough time to unstake> later
    await expect(stakingContract.unstake(stakedValue)).to.be.revertedWith("No available tokens to unstake");

    await increaseTime(UNSTAKE_FREEZE_MIN + 1);

    // <enough time to unstake> later
    await expect(stakingContract.unstake(stakedValue.add(20))).to.be.revertedWith("Insufficient amount to unstake");

    const unstakedValue = toBigNumber(25);
    await expect(stakingContract.unstake(unstakedValue))
      .to.emit(stakingContract, "Unstake")
      .withArgs(owner.address, unstakedValue);

    actualStake = {
      ...actualStake,
      staked: stakedValue.sub(unstakedValue.div(1)),
      frozenReward: getReward(stakedValue),
    };

    expect(await stakingToken.balanceOf(owner.address)).to.equal(toBigNumber(85));
    await testStakeValues();

  });

  it("Should transfer reward tokens to sender's account (claim reward)", async () => {
    const value1 = toBigNumber(40);
    await stakingContract.stake(value1);

    await increaseTime(REWARD_FREEZE_MIN - 3);

    // <not enough time for claiming reward> later
    await expect(stakingContract.claim()).to.be.revertedWith("No reward tokens to withdraw");

    const value2 = toBigNumber(20);
    await stakingContract.stake(value2);

    await increaseTime(REWARD_FREEZE_MIN + 2);

    // <enough time for claiming unfrozen reward> later
    const value3 = toBigNumber(15);
    await stakingContract.stake(value3);

    const rewardPart = getReward(value1.add(value2));
    await expect(stakingContract.claim())
      .to.emit(stakingContract, "Claim")
      .withArgs(owner.address, rewardPart);

    expect(await rewardToken.balanceOf(stakingContract.address)).to.equal(toBigNumber(90).sub(rewardPart));
    expect(await rewardToken.balanceOf(owner.address)).to.equal(rewardPart);

    await increaseTime(REWARD_FREEZE_MIN + 1);

    // <enough time for claiming rest of reward> later
    await stakingContract.claim();

    const rewardRest = getReward(value3);
    expect(await rewardToken.balanceOf(stakingContract.address)).to.equal(toBigNumber(90).sub(rewardPart).sub(rewardRest));
    expect(await rewardToken.balanceOf(owner.address)).to.equal(rewardPart.add(rewardRest));

    actualStake = {
      ...actualStake,
      staked: value1.add(value2).add(value3),
    };
    await testStakeValues();

  });

  it("Should update reward rate", async () => {
    const newRewardRate = 10; // 10%

    await stakingContract.setRewardRate(newRewardRate);
    expect(await stakingContract.rewardRate()).to.equal(newRewardRate);
  });

  it("Should update reward freeze period", async () => {
    const newRewardFreezePeriod = 20 * 60; // 20 min

    await stakingContract.setRewardFreezePeriod(newRewardFreezePeriod);
    expect(await stakingContract.rewardFreezePeriod()).to.equal(newRewardFreezePeriod);
  });

  it("Should update reward freeze period", async () => {
    const newUnstakeFreezePeriod = 30 * 60; // 30 min

    await stakingContract.setUnstakeFreezePeriod(newUnstakeFreezePeriod);
    expect(await stakingContract.unstakeFreezePeriod()).to.equal(newUnstakeFreezePeriod);
  });

});
