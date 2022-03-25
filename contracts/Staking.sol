//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Staking is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public stakingToken; // PL token
    IERC20 public rewardsToken;

    uint public rewardRate = 20; // 20%
    uint public rewardFreezePeriod = 10 * 1 minutes; // 10 min
    uint public unstakeFreezePeriod = 20 * 1 minutes; // 20 min

    // uint public totalStaked;

    struct StakeData {
        uint lastStakeDate;
        uint staked;
        uint availableReward;
        uint frozenReward;
    }

    mapping(address => StakeData) private _balances;

    modifier validAmount(uint amount) {
        require(amount > 0, "Not valid amount");
        _;
    }

    event Stake(address indexed stakeholder, uint amount);
    event Unstake(address indexed stakeholder, uint amount);
    event Claim(address indexed stakeholder, uint amount);

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    function stake(uint amount) external validAmount(amount) {
        StakeData storage userStake = _balances[msg.sender];

        if (isFreezePeriodPassed(userStake.lastStakeDate, rewardFreezePeriod)) {
            userStake.availableReward += userStake.frozenReward;
            userStake.frozenReward = 0;
        }

        userStake.lastStakeDate = block.timestamp;
        userStake.staked += amount;
        userStake.frozenReward += amount * rewardRate / 100;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Stake(msg.sender, amount);
        // totalStaked += amount;
    }

    function unstake(uint amount) external validAmount(amount){
        StakeData storage userStake = _balances[msg.sender];

        require(isFreezePeriodPassed(userStake.lastStakeDate, unstakeFreezePeriod), "No available tokens to unstake");
        require(amount <= userStake.staked, "Insufficient amount to unstake");
        unchecked {
            userStake.staked -= amount;
        }

        stakingToken.safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, amount);
        // totalStaked -= amount;
    }

    function claim() external {
        StakeData storage userStake = _balances[msg.sender];
        uint reward = userStake.availableReward;
        userStake.availableReward = 0;

        if (isFreezePeriodPassed(userStake.lastStakeDate, rewardFreezePeriod)) {
            reward += userStake.frozenReward;
            userStake.frozenReward = 0;
        }

        require(reward > 0, "No reward tokens to withdraw");

        rewardsToken.safeTransfer(msg.sender, reward);
        emit Claim(msg.sender, reward);
    }

    function setRewardRate(uint _rewardRate) external onlyRole(ADMIN_ROLE) {
        rewardRate = _rewardRate;
    }

    function setRewardFreezePeriod(uint _rewardFreezePeriod) external onlyRole(ADMIN_ROLE) {
        rewardFreezePeriod = _rewardFreezePeriod;
    }

    function setUnstakeFreezePeriod(uint _unstakeFreezePeriod) external onlyRole(ADMIN_ROLE) {
        unstakeFreezePeriod = _unstakeFreezePeriod;
    }

    function snapshotOfSenderStake() external view returns (StakeData memory) {
        return _balances[msg.sender];
    }

    function isFreezePeriodPassed(uint timestamp, uint period) private view returns (bool) {
        return (block.timestamp - timestamp) > period;
    }


}
