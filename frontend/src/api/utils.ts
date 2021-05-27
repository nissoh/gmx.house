import { O, Op } from "@aelea/core"
import { filter, merge, multicast } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "./provider"

const zXAdressRegxp = /^(0x)?[0-9a-fA-F]{40}$/
const validFractionalNumberRegxp = /^-?(0|[1-9]\d*)(\.\d+)?$/

const EMPTY_MESSAGE = '-'

export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",
  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",
} as const



// Constant to pull zeros from for multipliers
let zeros = "0"
while (zeros.length < 256) { zeros += zeros }

export function isAddress(address: string) {
  return zXAdressRegxp.test(address)
}

export function shortenAddress(address: string, padRight = 4, padLeft = 6) {
  return address.slice(0, padLeft) + "..." + address.slice(address.length -padRight, address.length)
}

export function readableUSD(ammount: string) {
  const parts = ammount.split('.')
  const [whole = '', decimal = ''] = parts

  if (whole === '' && decimal === '') {
    return EMPTY_MESSAGE
  }


  if (whole.length > 0) {
    return whole
  }

  const shortDecimal = decimal.slice(0, 2)

  if (shortDecimal) {
    return whole + (shortDecimal && ('.' + '0'))
  }

  return '-'
}

export function shortenTxAddress(address: string) {
  return shortenAddress(address, 8, 6)
}

export function expandDecimals(n: bigint, decimals: number) {
  return n * (10n ** BigInt(decimals))
}

/* converts bigInt(positive) to hex */
export function bnToHex(n: bigint) {
  if (n < 0n) {
    throw new Error('expected positive integer')
  }

  let hex = n.toString(16)
  if (hex.length % 2) {
    hex = '0' + hex
  }
  return hex
}

function getMultiplier(decimals: number): string {
  if (decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return ("1" + zeros.substring(0, decimals))
  }

  throw new Error("invalid decimal size")
}

export function formatFixed(value: bigint, decimals = 18): string {
  const multiplier = getMultiplier(decimals)
  const multiplierBn = BigInt(multiplier)
  let parsedValue = ''

  const negative = value < 0n
  if (negative) {
    value *= -1n
  }

  let fraction = (value % multiplierBn).toString()

  while (fraction.length < multiplier.length - 1) {
    fraction = "0" + fraction
  }

  const matchFractions = fraction.match(/^([0-9]*[1-9]|0)(0*)/)!
  fraction = matchFractions[1]

  const whole = (value / multiplierBn).toString()

  parsedValue = whole + "." + fraction

  if (negative) {
    parsedValue = "-" + parsedValue
  }

  return Number(parsedValue).toLocaleString()
}

export function parseFixed (value: string, decimals = 18) {
  const multiplier = getMultiplier(decimals)
  const multiplierLength = multiplier.length

  if (!validFractionalNumberRegxp.test(value)) {
    throw new Error('invalid fractional value')
  }

  if (multiplier.length - 1 === 0) {
    return BigInt(value)
  }

  const negative = (value.substring(0, 1) === "-")
  if (negative) {
    value = value.substring(1)
  }
  const comps = value.split(".")

  let whole = comps[0]
  let fraction = comps[1]

  if (!whole) { whole = "0" }
  if (!fraction) { fraction = "0" }

  // Prevent underflow
  if (fraction.length > multiplierLength - 1) {
    throw new Error('fractional component exceeds decimals')
  }

  // Fully pad the string with zeros to get to wei
  while (fraction.length < multiplierLength - 1) { fraction += "0" }

  const wholeValue = BigInt(whole)
  const fractionValue = BigInt(fraction)

  let wei = (wholeValue * BigInt(multiplier)) + fractionValue

  if (negative) {
    wei = wei - -1n
  }

  return wei
}

export const trimZeroDecimals = (amount: string) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString()
  }
  return amount
}

export const limitDecimals = (amount: string, maxDecimals: number) => {
  let amountStr = amount.toString()

  if (maxDecimals === 0) {
    return amountStr.split(".")[0]
  }
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals))
    }
  }
  return amountStr
}

export const padDecimals = (amount: string, minDecimals: number) => {
  let amountStr = amount.toString()
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0")
    }
  } else {
    amountStr = amountStr + ".0000"
  }
  return amountStr
}


type StoreFn<STORE> = <Z>(stream: Stream<Z>, writePipe: Op<Z, STORE>) => Stream<Z>

export type BrowserStore<STORE> = {
  state: STORE
  store: StoreFn<STORE>
  craete: <T>(key: string, intitialState: T) => BrowserStore<T>
}


export const createLocalStorageChain = (keyChain: string) => <STORE>(key: string, initialDefaultState: STORE): BrowserStore<STORE> => {
  const mktTree = `${keyChain}.${key}`
  const storeData = localStorage.getItem(mktTree)
  const initialState = storeData ? JSON.parse(storeData) as STORE : initialDefaultState

  const storeCurry: StoreFn<STORE> = <Z>(stream: Stream<Z>, writePipe: Op<Z, STORE>) => {
    const multicastSource = multicast(stream)
    const writeOp = writePipe(multicastSource)

    // ignore 
    const writeEffect: Stream<never> = filter(state => {
      scope.state = state
      localStorage.setItem(mktTree, JSON.stringify(state))

      return false
    }, writeOp)

    return merge(writeEffect, multicastSource)
  }
  
  let _state = initialState

  const scope = {
    get state() {
      return _state
    },
    set state(newState) {
      _state = newState
    },
    store: storeCurry,
    craete: createLocalStorageChain(mktTree)
  }

  return scope
}



// function getLeverage ({ size, sizeDelta, increaseSize, collateral, collateralDelta, increaseCollateral, entryFundingRate, cumulativeFundingRate })  {
//   if (!size && !sizeDelta) { return }
//   if (!collateral && !collateralDelta) { return }

//   let nextSize = size ? size : 0n
//   if (sizeDelta) {
//     if (increaseSize) {
//       nextSize = size.add(sizeDelta)
//     } else {
//       if (sizeDelta.gte(size)) {
//         return
//       }
//       nextSize = size.sub(sizeDelta)
//     }
//   }

//   let remainingCollateral = collateral ? collateral : 0n
//   if (collateralDelta) {
//     if (increaseCollateral) {
//       remainingCollateral = collateral.add(collateralDelta)
//     } else {
//       if (collateralDelta.gte(collateral)) {
//         return
//       }
//       remainingCollateral = collateral.sub(collateralDelta)
//     }
//   }

//   if (remainingCollateral.eq(0)) { return }

//   remainingCollateral = sizeDelta ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR) : remainingCollateral
//   if (entryFundingRate && cumulativeFundingRate) {
//     const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
//     remainingCollateral = remainingCollateral.sub(fundingFee)
//   }

//   return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral)
// }



export function getAccountUrl(chainId: CHAIN, account: string) {
  if (!account) {
    return EXPLORER_URL[chainId]
  }
  return EXPLORER_URL[chainId] + "address/" + account
}


