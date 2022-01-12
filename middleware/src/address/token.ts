import { ARBITRUM_TRADEABLE_ADDRESS } from "."
import { Token, TradeableToken } from "../types"
import { ARBITRUM_USD_COINS } from "./arbitrum"
import { TOKEN_SYMBOL } from "./symbol"


export const AddressZero = "0x0000000000000000000000000000000000000000"


export const TOKENS_ARBITRUM = [
  {
    name: "USD Coin",
    symbol: TOKEN_SYMBOL.BUSD,
    decimals: 6,
    address: ARBITRUM_USD_COINS.USDC
  }
] as Token[]

export const TRADEABLE_TOKENS_ARBITRUM = [
  {
    name: "Bitcoin",
    symbol: TOKEN_SYMBOL.BTC,
    decimals: 18,
    address: ARBITRUM_TRADEABLE_ADDRESS.WBTC,
  },
  {
    name: "Ethereum",
    symbol: TOKEN_SYMBOL.ETH,
    decimals: 18,
    address: ARBITRUM_TRADEABLE_ADDRESS.WETH,
  },
  {
    name: "Chainlink",
    symbol: TOKEN_SYMBOL.LINK,
    decimals: 18,
    address: ARBITRUM_TRADEABLE_ADDRESS.LINK,
  },
  {
    name: "Uniswap",
    symbol: TOKEN_SYMBOL.UNI,
    decimals: 18,
    address: ARBITRUM_TRADEABLE_ADDRESS.UNI,
  },
] as TradeableToken[]

export function strictGet<A, B>(map: Map<B, A>, key: B) {
  const match = map.get(key)
  if (match) {
    return match
  }

  throw new Error(`${groupByMapMany.name}() is missing key: ${key}`)
}

export function groupByMapMany<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  const map = list.reduce((previous, currentItem) => {
    const group = getKey(currentItem)
    if (!previous[group]) previous[group] = []
    previous[group].push(currentItem)
    return previous
  }, {} as Record<B, A[]>)
  return map
}




export function groupByMap<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
  const map = new Map<B, A>()
  list.forEach((item) => {
    const key = getKey(item)

    if (map.get(key)) {
      console.warn(`${groupByMap.name}() is overwriting property: ${key}`)
    }

    map.set(key, item)
  })

  return map
}
// export function groupByMap<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B) {
//   const map = {} as Record<B, A>
//   list.forEach((item) => {
//     const key = getKey(item)

//     if (map[key]) {
//       console.warn(`${groupByMap.name}() is overwriting property: ${key}`)
//     }

//     map[key] = item
//   })

//   return map
// }


export const TOKEN_ADDRESS_MAP = groupByMap(TOKENS_ARBITRUM, token => token.address)
export const TRADEABLE_TOKEN_ADDRESS_MAP = groupByMap(TRADEABLE_TOKENS_ARBITRUM, token => token.address)

