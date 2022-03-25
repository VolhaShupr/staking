# 2 Staking
Sample contract

Staking contract allows users to transfer (stake) their tokens to the contract for some period (minimum 20 minutes), after this period to withdraw (unstake) them and to claim reward tokens in rate of 20% after 10 minutes from stake action

Participating verified contracts:
- LP Token - [UNI-V2](https://rinkeby.etherscan.io/token/0xc4926BD726c1704D6D0002eA52D5908620076BBb)
- Reward Token - [MNT](https://rinkeby.etherscan.io/token/0x08da338ec0947ac3f504abde37a7dbbc856a3ed1)
- Staking contract - [contract](https://rinkeby.etherscan.io/address/0x5e4ded7acef23e2d2fa8b7c7ab3e7df9c87b5daa)

A liquidity pool was created on Uniswap V2 to receive LP tokens (MNT + ETH --> UNI-V2)


```shell
npx hardhat accounts
npx hardhat stake
npx hardhat unstake
npx hardhat claim

npx hardhat run --network rinkeby scripts/deploy.ts
npx hardhat verify --network rinkeby DEPLOYED_CONTRACT_ADDRESS <arg>

npx hardhat test
npx hardhat coverage
npx hardhat size-contracts

npx hardhat help
npx hardhat node
npx hardhat compile
npx hardhat clean
```
