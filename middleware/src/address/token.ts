import { groupByMap } from "@aelea/utils"
import { Token } from "../types"
import { ARBITRUM_CONTRACTS } from "./contract"
import { SYMBOL } from "./symbol"

export const AddressZero = "0x0000000000000000000000000000000000000000"

export const TOKENS_BSC = [
  {
    name: "Bitcoin",
    symbol: SYMBOL.BTC,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.BTC,
  },
  {
    name: "Ethereum",
    symbol: SYMBOL.ETH,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.WETH,
  },
  {
    name: "USD Gambit",
    symbol: SYMBOL.USDG,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.USDG
  },
  {
    name: "USD Coin",
    symbol: SYMBOL.BUSD,
    decimals: 6,
    address: ARBITRUM_CONTRACTS.USDC
  }
] as Token[]

export const TOKENS_ARBITRUM = [
  {
    name: "Bitcoin",
    symbol: SYMBOL.BTC,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.BTC,
  },
  {
    name: "Ethereum",
    symbol: SYMBOL.ETH,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.WETH,
  },
  {
    name: "USD Gambit",
    symbol: SYMBOL.USDG,
    decimals: 18,
    address: ARBITRUM_CONTRACTS.USDG
  },
  {
    name: "USD Coin",
    symbol: SYMBOL.BUSD,
    decimals: 6,
    address: ARBITRUM_CONTRACTS.USDC
  }
] as Token[]

export function groupByMapMany<A, B extends keyof any>(list: A[], keyGetter: (v: A) => B) {
  const map = list.reduce((previous, currentItem) => {
    const group = keyGetter(currentItem)
    if (!previous[group]) previous[group] = []
    previous[group].push(currentItem)
    return previous
  }, {} as Record<B, A[]>)
  return map
}


export const TOKEN_ADDRESS_MAP = groupByMap(TOKENS_ARBITRUM, (x) => x.address)

