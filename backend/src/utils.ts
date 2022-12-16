import { BASIS_POINTS_DIVISOR, formatFixed, formatReadableUSD, groupByMapMany, IPositionLiquidated, IPricefeed, isTradeClosed, isTradeLiquidated, isTradeOpen, isTradeSettled, ITrade, TradeStatus, unixTimestampNow } from '@gambitdao/gmx-middleware'
import { IAccountLadderSummary } from 'common'

const MIN_OF_MAX_COLLATERAL = 1000000000000000000000000000000000n

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



export function toAccountCompetitionSummary(list: ITrade[], priceMap: { [k: string]: IPricefeed }, endDate: number): IAccountLadderSummary[] {
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

      maxCollateral: 0n,

      lossTradeCount: 0,
      winTradeCount: 0,
      settledTradeCount: 0,
      openTradeCount: 0,
    }

    const sortedTradeList = tradeList.sort((a, b) => a.timestamp - b.timestamp)

    const initSeed = {
      maxUsedCollateral: 0n,
      positions: {}
    } as { maxUsedCollateral: bigint, positions: { [k: string]: bigint } }



    const adjustmentsDuringTimerange = sortedTradeList
      .flatMap(next => [...next.updateList, ...isTradeClosed(next) ? [next.closedPosition] : isTradeLiquidated(next) ? [next.liquidatedPosition as IPositionLiquidated & { key: string }] : []])
      // .filter(n => n.timestamp <= endDate)
      .sort((a, b) => a.timestamp - b.timestamp)



    const { maxUsedCollateral } = adjustmentsDuringTimerange.reduce((seed, next) => {
      const prevCollateral = seed.positions[next.key] || 0n

      seed.positions[next.key] = next.__typename === 'UpdatePosition' ? next.collateral > prevCollateral ? next.collateral : prevCollateral : 0n

      const nextUsedCollateral = Object.values(seed.positions).reduce((s, n) => s + n, 0n)

      if (nextUsedCollateral > seed.maxUsedCollateral) {
        seed.maxUsedCollateral = nextUsedCollateral
      }

      return seed
    }, initSeed)



    const summary = sortedTradeList.reduce((seed, next): IAccountLadderSummary => {
      const filteredUpdates = [...next.updateList, ...isTradeClosed(next) ? [next.closedPosition] : isTradeLiquidated(next) ? [next.liquidatedPosition as IPositionLiquidated & { key: string }] : []].filter(update => update.timestamp <= endDate)
      const tradeMaxCollateral = filteredUpdates.reduce((s, n) => n.collateral > s ? n.collateral : s, 0n)
      const collateral = seed.maxCollateral + tradeMaxCollateral
      const lastUpdate = filteredUpdates[filteredUpdates.length - 1]

      const indexTokenMarkPrice = BigInt(priceMap['_' + next.indexToken].c)
      const openDelta = lastUpdate.__typename === 'UpdatePosition' ? getPnL(next.isLong, lastUpdate.averagePrice, indexTokenMarkPrice, lastUpdate.size) : 0n

      const fee = seed.fee + next.fee
      const openPnl = seed.openPnl + openDelta
      const realisedPnl = seed.realisedPnl + lastUpdate.realisedPnl
      const pnl = openPnl + realisedPnl

      const usedMinProfit = maxUsedCollateral - pnl > 0n ? pnl : 0n
      const maxCollateral = usedMinProfit > maxUsedCollateral ? usedMinProfit : maxUsedCollateral

      const roi = div(pnl, (maxCollateral > MIN_OF_MAX_COLLATERAL ? maxCollateral : MIN_OF_MAX_COLLATERAL))

      const currentPnl = lastUpdate.realisedPnl + openDelta
      const winTradeCount = seed.winTradeCount + (currentPnl > 0n ? 1 : 0)
      const lossTradeCount = seed.lossTradeCount + (currentPnl < 0n ? 1 : 0)


      const cumulativeLeverage = seed.cumulativeLeverage + div(lastUpdate.size, maxCollateral)

      console.log(cumulativeLeverage)


      return {
        collateral, account, realisedPnl, openPnl, pnl, roi, maxCollateral,

        lossTradeCount,
        winTradeCount,
        settledTradeCount: 0,
        openTradeCount: 0,

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