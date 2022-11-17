import { BASIS_POINTS_DIVISOR, formatFixed, groupByMapMany, IPricefeed, isTradeOpen, isTradeSettled, ITrade, TradeStatus, unixTimestampNow } from '@gambitdao/gmx-middleware'
import { IAccountLadderSummary } from 'common'

const MIN_OF_MAX_COLLATERAL = 500000000000000000000000000000000n

export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses = 0

  return () => {
    const now = unixTimestampNow()
    if (now - lastTimePasses > timespan) {
      lastTimePasses = now
      return true
    }

    return false
  }
}

export const cacheMap = (cacheMap: any) => async <T>(key: string, lifespan: number, cacheFn: () => Promise<T>): Promise<T> => {
  const cacheEntry = cacheMap[key]

  if (cacheEntry && !cacheMap[key].lifespanFn()) {
    return cacheEntry.item
  } else {
    const lifespanFn = cacheMap[key]?.lifespanFn ?? timespanPassedSinceInvoke(lifespan)
    lifespanFn()
    cacheMap[key] = { item: cacheFn(), lifespanFn }
    return cacheMap[key].item
  }
}

export function getPnL(isLong: boolean, averagePrice: bigint, priceChange: bigint, size: bigint) {
  const priceDelta = averagePrice > priceChange ? averagePrice - priceChange : priceChange - averagePrice
  const hasProfit = isLong ? priceChange > averagePrice : averagePrice > priceChange
  const delta = size * priceDelta / averagePrice

  return hasProfit ? delta : -delta
}

export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    return 0n
  }

  return a * BASIS_POINTS_DIVISOR / b
}


export function bnDiv(a: bigint, b: bigint): number {
  return formatFixed(div(a, b), 4)
}

export function toAccountCompetitionSummary(list: ITrade[], priceMap: { [k: string]: IPricefeed }): IAccountLadderSummary[] {
  const tradeListMap = groupByMapMany(list, a => a.account)
  const tradeListEntries = Object.entries(tradeListMap)

  return tradeListEntries.reduce((seed, [account, tradeList]) => {

    const seedAccountSummary: IAccountLadderSummary = {
      claim: null,
      account,
      cumulativeLeverage: 0n,

      collateral: 0n,
      size: 0n,

      fee: 0n,
      realisedPnl: 0n,

      collateralDelta: 0n,
      sizeDelta: 0n,
      realisedPnlPercentage: 0n,
      performancePercentage: 0n,
      roi: 0n,
      openPnl: 0n,
      pnl: 0n,

      usedCollateralMap: {},
      maxCollateral: 0n,

      winTradeCount: 0,
      settledTradeCount: 0,
      openTradeCount: 0,
    }

    const sortedTradeList = tradeList.sort((a, b) => a.timestamp - b.timestamp)
    const summary = sortedTradeList.reduce((seed, next): IAccountLadderSummary => {

      const tradeMaxCollateral = next.updateList.reduce((s, n) => n.collateral > s ? n.collateral : s, 0n)
      const usedCollateralMap = {
        ...seed.usedCollateralMap,
        [next.key]: tradeMaxCollateral,
        // [next.key]: next.status === TradeStatus.OPEN ? next.collateral : 0n,
      }
      const usedCollateral = Object.values(usedCollateralMap).reduce((s, n) => s + n, 0n)

      const indexTokenMarkPrice = BigInt(priceMap['_' + next.indexToken].c)
      const openDelta = isTradeOpen(next) ? getPnL(next.isLong, next.averagePrice, indexTokenMarkPrice, next.size) : 0n
      const isSettled = isTradeSettled(next)

      const fee = seed.fee + next.fee
      const realisedPnl = seed.realisedPnl + next.realisedPnl
      const openPnl = seed.openPnl + openDelta
      const pnl = openPnl + realisedPnl

      const usedMinProfit = usedCollateral - pnl
      const maxCollateral = usedMinProfit > seed.collateral ? usedMinProfit : usedCollateral
      const collateral = seed.maxCollateral + tradeMaxCollateral
      const roi = pnl * BASIS_POINTS_DIVISOR / (maxCollateral > MIN_OF_MAX_COLLATERAL ? maxCollateral : MIN_OF_MAX_COLLATERAL)

      const winTradeCount = seed.winTradeCount + (isSettled && next.realisedPnl > 0n ? 1 : 0)
      const settledTradeCount = isSettled ? seed.settledTradeCount + 1 : seed.settledTradeCount
      const openTradeCount = next.status === TradeStatus.OPEN ? seed.openTradeCount + 1 : seed.openTradeCount

      const cumulativeLeverage = seed.cumulativeLeverage + div(next.size, maxCollateral)


      return {
        collateral, account, realisedPnl, openPnl, pnl, usedCollateralMap, roi, maxCollateral,

        settledTradeCount,
        openTradeCount,
        winTradeCount,

        cumulativeLeverage,

        claim: null,
        fee,
        collateralDelta: seed.collateralDelta + next.collateralDelta,


        realisedPnlPercentage: seed.realisedPnlPercentage + next.realisedPnlPercentage,
        size: seed.size + next.size,
        sizeDelta: seed.sizeDelta + next.sizeDelta,
        performancePercentage: 0n,


      }
    }, seedAccountSummary)

    seed.push(summary)

    return seed
  }, [] as IAccountLadderSummary[])
}