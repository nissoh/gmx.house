import { intervalInMsMap, USD_DECIMALS } from "./constant"
import { IPagableResponse, IPageable, ISortable } from "./types"

export const ETH_ADDRESS_REGEXP = /^0x[a-fA-F0-9]{40}$/i
export const TX_HASH_REGEX = /^0x([A-Fa-f0-9]{64})$/i
export const VALID_FRACTIONAL_NUMBER_REGEXP = /^-?(0|[1-9]\d*)(\.\d+)?$/

const EMPTY_MESSAGE = '-'



// Constant to pull zeros from for multipliers
let zeros = "0"
while (zeros.length < 256) { zeros += zeros }

export function isAddress(address: string) {
  return ETH_ADDRESS_REGEXP.test(address)
}

export function shortenAddress(address: string, padRight = 4, padLeft = 6) {
  return address.slice(0, padLeft) + "..." + address.slice(address.length -padRight, address.length)
}

export function shortPostAdress(address: string) {
  return address.slice(address.length -4, address.length)
}

export function readableNumber(ammount: number) {
  const parts = ammount.toString().split('.')
  const [whole = '', decimal = ''] = parts

  if (whole === '' && decimal === '') {
    return EMPTY_MESSAGE
  }

  if (whole.replace(/^-/, '') === '0') {
    const shortDecimal = decimal.slice(0, 2)
    return whole + (shortDecimal ? '.' + shortDecimal  : '')
  }

  return Number(whole).toLocaleString()
}

export function formatReadableUSD(ammount: bigint) {
  const str = formatFixed(ammount, USD_DECIMALS)
  return readableNumber(str)
}

export function shortenTxAddress(address: string) {
  return shortenAddress(address, 8, 6)
}

export function expandDecimals(n: bigint, decimals: number) {
  return n * (10n ** BigInt(decimals))
}

function getMultiplier(decimals: number): string {
  if (decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return ("1" + zeros.substring(0, decimals))
  }

  throw new Error("invalid decimal size")
}

export function formatFixed(value: bigint, decimals = 18): number {
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

  return Number(parsedValue)
}

export function parseFixed(input: string | number, decimals = 18) {
  let value = typeof input === 'number' ? String(input) : input

  const multiplier = getMultiplier(decimals)
  const multiplierLength = multiplier.length

  if (!VALID_FRACTIONAL_NUMBER_REGEXP.test(value)) {
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


/* converts bigInt(positive) to hex */
export function bnToHex(n: bigint) {
  if (n < 0n) {
    throw new Error('expected positive integer')
  }

  let hex = n.toString(16)
  if (hex.length % 2) {
    hex = 'x' + hex
  }
  return hex
}

export function bytesToHex(uint8a: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < uint8a.length; i++) {
    hex += uint8a[i].toString(16).padStart(2, '0')
  }
  return hex
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string' || hex.length % 2) throw new Error('Expected valid hex')
  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < array.length; i++) {
    const j = i * 2
    array[i] = Number.parseInt(hex.slice(j, j + 2), 16)
  }
  return array
}

export function hex2asc(pStr: string) {
  let tempstr = ''
  for (let b = 0; b < pStr.length; b = b + 2) {
    tempstr = tempstr + String.fromCharCode(parseInt(pStr.substr(b, 2), 16))
  }
  return tempstr
}

export declare type Nominal<T, Name extends string> = T & {
  [Symbol.species]: Name
}

export type UTCTimestamp = Nominal<number, "UTCTimestamp">

export const tzOffset = new Date().getTimezoneOffset() * 60000

export function timeTzOffset(ms: number): UTCTimestamp {
  return Math.floor((ms - tzOffset) / 1000) as UTCTimestamp
}

export function unixTimeTzOffset(ms: number): UTCTimestamp {
  return ms as UTCTimestamp
}


export type TimelineTime = {
  time: number
}

export function fillIntervalGap<T extends TimelineTime, R extends TimelineTime>(
  interval: intervalInMsMap, fillMap: (next: T) => R, fillGapMap: (prev: R, next: T) => R, squashMap: (prev: R, next: T) => R = fillGapMap
) {
  return (timeline: R[], next: T) => {
    const lastIdx = timeline.length - 1
    const prev = timeline[lastIdx]

    const barSpan = (next.time - prev.time) / interval

    if (barSpan > 1) {
      const barSpanCeil = Math.ceil(barSpan)

      for (let index = 1; index < barSpanCeil; index++) {
        timeline.push({ ...fillGapMap(prev, next), time: prev.time + interval * index })
      }

      const time = timeline[timeline.length - 1].time + interval

      timeline.push({ ...fillMap(next), time })

      return timeline
    }
    
    if (barSpan < 1) {
      timeline.splice(lastIdx, 1, squashMap(prev, next))
    } else {
      timeline.push(fillMap(next))
    }

    return timeline
  }
}



export async function pagingQuery<T, ReqParams extends IPageable & (ISortable<keyof T> | {})>(
  queryParams: ReqParams,
  query: Promise<T[]>,
  customComperator?: (a: T, b: T) => number
): Promise<IPagableResponse<T>> {
  const res = await query
  let list = res
  if ('sortBy' in queryParams) {
    const sortBy = queryParams.sortBy

    const comperator = typeof customComperator === 'function' ? customComperator : (a: T, b: T) =>
      queryParams.sortDirection === 'asc'
        ? Number(b[sortBy]) - Number(a[sortBy])
        : Number(a[sortBy]) - Number(b[sortBy])
    

    list = res.sort(comperator)
  }

  const { pageSize, offset } = queryParams
  const page = list.slice(queryParams.offset, offset + pageSize)
  return { offset, page, pageSize }
}


