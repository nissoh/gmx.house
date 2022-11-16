import { BASIS_POINTS_DIVISOR, calculatePositionDelta, groupByMapMany, IPricefeed, isTradeSettled, ITrade, TradeStatus, unixTimestampNow } from '@gambitdao/gmx-middleware'
import { IAccountLadderSummary } from 'common'


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

export function toAccountCompetitionSummary(list: ITrade[], priceMap: { [k: string]: IPricefeed }): IAccountLadderSummary[] {
  const tradeListMap = groupByMapMany(list, a => a.account)
  const tradeListEntries = Object.entries(tradeListMap)

  return tradeListEntries.reduce((seed, [account, tradeList]) => {

    const seedAccountSummary: IAccountLadderSummary = {
      claim: null,
      account,

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

      const usedCollateralMap = {
        ...seed.usedCollateralMap,
        [next.key]: next.updateList.reduce((seed, next) => next.collateral > seed ? next.collateral : seed, 0n),
        // [next.key]: next.status === TradeStatus.OPEN ? next.collateral : 0n,
      }
      const usedCollateral = Object.values(usedCollateralMap).reduce((s, n) => s + n, 0n)

      const indexTokenMarkPrice = BigInt(priceMap['_' + next.indexToken].c)
      const posDelta = calculatePositionDelta(indexTokenMarkPrice, next.averagePrice, next.isLong, next)
      const isSettled = isTradeSettled(next)


      const realisedPnl = seed.realisedPnl + next.realisedPnl
      const openPnl = seed.openPnl + posDelta.delta
      const pnl = openPnl + realisedPnl

      const usedMinProfit = usedCollateral - pnl
      const collateral = usedMinProfit > seed.collateral ? usedMinProfit : usedCollateral
      const roi = pnl * BASIS_POINTS_DIVISOR / (collateral > 500000000000000000000000000000000n ? collateral : 500000000000000000000000000000000n)

      return {
        collateral, account, realisedPnl, openPnl, pnl, usedCollateralMap, roi,

        maxCollateral: 0n,
        // openCollateral: 0n,
        claim: null,
        fee: seed.fee + next.fee,
        collateralDelta: seed.collateralDelta + next.collateralDelta,

        realisedPnlPercentage: seed.realisedPnlPercentage + next.realisedPnlPercentage,
        size: seed.size + next.size,
        sizeDelta: seed.sizeDelta + next.sizeDelta,
        performancePercentage: 0n,
        // performancePercentage: seed.performancePercentage + performancePercentage,


        winTradeCount: seed.winTradeCount + (isSettled && next.realisedPnl > 0n ? 1 : 0),
        settledTradeCount: seed.settledTradeCount + (isSettled ? 1 : 0),
        openTradeCount: next.status === TradeStatus.OPEN ? seed.openTradeCount + 1 : seed.openTradeCount,
      }
    }, seedAccountSummary)

    seed.push(summary)

    return seed
  }, [] as IAccountLadderSummary[])
}