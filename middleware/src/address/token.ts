import { groupByMap } from "@aelea/utils"
import { Token } from "../types"
import { BSC_CONTRACTS } from "./contract"
import { SYMBOL } from "./symbol"

export const AddressZero = "0x0000000000000000000000000000000000000000"

export const TOKENS_BSC = [
  {
    name: "Bitcoin",
    symbol: SYMBOL.BTC,
    decimals: 18,
    address: BSC_CONTRACTS.BTC,
  },
  {
    name: "Ethereum",
    symbol: SYMBOL.ETH,
    decimals: 18,
    address: BSC_CONTRACTS.ETH,
  },
  {
    name: "Binance Coin",
    symbol: SYMBOL.WBNB,
    decimals: 18,
    address: BSC_CONTRACTS.WBNB,
  },
  {
    name: "USD Gambit",
    symbol: SYMBOL.USDG,
    decimals: 18,
    address: BSC_CONTRACTS.USDG
  },
  {
    name: "USD Binance",
    symbol: SYMBOL.BUSD,
    decimals: 18,
    address: BSC_CONTRACTS.BUSD
  }
] as Token[]

export const TOKEN_ADDRESS_MAP = groupByMap(TOKENS_BSC, (x) => x.address)

