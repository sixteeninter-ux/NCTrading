// config.js
window.APP_CONFIG = {
  CHAIN_ID_DEC: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC Mainnet",
  RPC_URL: "https://bsc-dataseed.binance.org/",
  BLOCK_EXPLORER: "https://bscscan.com",

  PROJECT_NAME: "New Currency Trading",
  TOKEN_NAME: "New Currency Coin",
  TOKEN_SYMBOL: "NC",

  CORE: "0xAE2523dE8eD5EcE8e160EDEB157CAc108F9E163e",
  VAULT: "0xaC5243587008f786D4b30424dB9B3445C117F1fD",
  BINARY: "0x335416BBD881265B6dA01F535dFaF0B164Bd303B",
  STAKING_V5: "0xd1431576a8b28ed2B72212284513f336d1465AE2",

  USDT: "0x55d398326f99059fF775485246999027B3197955",
  NC: "0xA0db9B043EA0387BA0f7480189F0392EdAA72108",

  PACKAGES: {
    1: { name: "Small", usdt: 100, color: "blue" },
    2: { name: "Medium", usdt: 500, color: "gold" },
    3: { name: "Large", usdt: 1000, color: "purple" }
  },

  ERC20_ABI: [
    "function name() view returns(string)",
    "function symbol() view returns(string)",
    "function decimals() view returns(uint8)",
    "function balanceOf(address) view returns(uint256)",
    "function allowance(address,address) view returns(uint256)",
    "function approve(address,uint256) returns(bool)"
  ],

  CORE_ABI: [
    "function USDT() view returns(address)",
    "function NC() view returns(address)",
    "function VAULT() view returns(address)",
    "function BINARY() view returns(address)",
    "function STAKING() view returns(address)",
    "function treasury() view returns(address)",
    "function COMPANY_WALLET() view returns(address)",

    "function smallNC() view returns(uint256)",
    "function mediumNC() view returns(uint256)",
    "function largeNC() view returns(uint256)",

    "function priceUSDT(uint8 p) view returns(uint256)",
    "function ncPrincipal(uint8 p) view returns(uint256)",

    "function registered(address) view returns(bool)",
    "function users(address) view returns(address sponsor,address parent,bool sideRight,uint8 pkg,uint8 rank,uint32 directSmallOrMore)",

    "function leftChild(address) view returns(address)",
    "function rightChild(address) view returns(address)",

    "function buyOrUpgrade(uint8 newPkg,address sponsor,address placementParent,bool sideRight)"
  ],

  VAULT_ABI: [
    "function earns(address) view returns(uint256 unlockedUSDT,uint256 claimedUSDT,uint256 lockedUSDT,uint64 lockStartUSDT,uint64 lockEndUSDT,uint256 expiredUSDT,uint256 unlockedDF,uint256 claimedDF,uint256 lockedDF,uint64 lockStartDF,uint64 lockEndDF,uint256 expiredDF)",
    "function claimableUSDT(address u) view returns(uint256)",
    "function claimableDF(address u) view returns(uint256)",
    "function claim()"
  ],

  BINARY_ABI: [
    "function volumesOf(address u) view returns(uint256 l,uint256 r,uint256 p)"
  ],

  STAKING_V5_ABI: [
    "function mlm() view returns(address)",
    "function stakeCount(address user) view returns(uint256)",
    "function pendingRewardTotal(address user) view returns(uint256)",
    "function pendingReward(address user,uint256 stakeId) view returns(uint256)",
    "function stakeAt(address user,uint256 i) view returns(uint8 pkg,uint256 principal,uint64 start,uint64 end,bool claimed)",
    "function claimStake(uint256 stakeId)",
    "function claimAllMatured(uint256 maxClaims)"
  ]
};
