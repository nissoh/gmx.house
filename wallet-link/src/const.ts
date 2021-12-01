

export enum CHAIN {
  ETH = 1,
  ETH_ROPSTEN = 3,
  ETH_KOVAN = 42,
  ETH_RINKBY = 4,
  ETH_GOERLI = 5,

  BSC = 56,
  BSC_TESTNET = 97,

  ARBITRUM = 42161,
  ARBITRUM_RINKBY = 421611,
}

const BSC_RPC_PROVIDERS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed3.defibit.io",
  "https://bsc-dataseed4.defibit.io",
  "https://bsc-dataseed2.ninicoin.io",
  "https://bsc-dataseed3.ninicoin.io",
  "https://bsc-dataseed4.ninicoin.io",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org"
]

const ARBITRUM_RPC_PROVIDERS = [
  "https://arb1.arbitrum.io/rpc"
]

export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",
  [CHAIN.ETH_RINKBY]: "https://rinkeby.etherscan.io/",
  [CHAIN.ETH_GOERLI]: "https://goerli.etherscan.io/",

  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",

  [CHAIN.ARBITRUM]: "https://arbiscan.io/",
  [CHAIN.ARBITRUM_RINKBY]: "https://rinkeby-explorer.arbitrum.io/",
}

interface AddEthereumChainParameter {
  chainId: string; // A 0x-prefixed hexadecimal string
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string; // 2-6 characters long
    decimals: 18;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[]; // Currently ignored.
}


export const NETWORK_METADATA: {[k: string]: AddEthereumChainParameter} = {

  [CHAIN.ETH]: {
    chainName: 'Ethereum Mainnet',
    chainId: '0x' + CHAIN.ETH.toString(16),
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ETH]],
    rpcUrls: ["https://api.infura.io/v1/jsonrpc/mainnet"],
  },

  [CHAIN.BSC]: {
    chainId: '0x' + CHAIN.BSC.toString(16),
    chainName: 'BSC',
    nativeCurrency: {
      name: 'BNB Coin',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: BSC_RPC_PROVIDERS,
    blockExplorerUrls: ['https://bscscan.com'],
  },
  [CHAIN.BSC_TESTNET]: {
    chainId: '0x' + CHAIN.BSC_TESTNET.toString(16),
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB Coin',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
  [CHAIN.ARBITRUM_RINKBY]: {
    chainId: '0x' + CHAIN.ARBITRUM_RINKBY.toString(16),
    chainName: "Arbitrum Testnet",
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ["https://rinkeby.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"],
  },
  [CHAIN.ARBITRUM]: {
    chainName: 'Arbitrum',
    chainId: '0x' + CHAIN.ARBITRUM.toString(16),
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: [EXPLORER_URL[CHAIN.ARBITRUM]],
    rpcUrls: ARBITRUM_RPC_PROVIDERS,
  },
}