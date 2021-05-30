import { groupByMap } from "@aelea/utils"

export const AddressZero = "0x0000000000000000000000000000000000000000"

export const TOKENS_BSC = [
  {
    name: "Bitcoin",
    symbol: 'BTC',
    decimals: 18,
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  },
  {
    name: "Ethereum",
    symbol: 'ETH',
    decimals: 18,
    address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  },
  {
    name: "Binance Coin",
    symbol: 'WBNB',
    decimals: 18,
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  {
    name: "USD Gambit",
    symbol: 'USDG',
    decimals: 18,
    address: '0xE14F46Ee1e23B68003bCED6D85465455a309dffF'
  },
  {
    name: "USD Binance",
    symbol: 'BUSD',
    decimals: 18,
    address: "0xae7486c680720159130b71e0f9EF7AFd8f413227"
  },
  {
    name: "Test Token",
    symbol: 'TST',
    decimals: 8,
    address: "0x341F41c455fB3E08A1078D1a9c4dAd778c41E7C4",
  }
]

export const TOKEN_ADDRESS_MAP = groupByMap(TOKENS_BSC, (x) => x.address)

