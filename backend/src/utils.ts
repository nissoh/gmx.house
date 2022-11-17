import { BASIS_POINTS_DIVISOR, formatFixed, formatReadableUSD, groupByMapMany, IPositionLiquidated, IPricefeed, isTradeClosed, isTradeOpen, isTradeSettled, ITrade, TradeStatus, unixTimestampNow } from '@gambitdao/gmx-middleware'
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

      maxCollateral: 0n,

      lossTradeCount: 0,
      winTradeCount: 0,
      settledTradeCount: 0,
      openTradeCount: 0,
    }

    const sortedTradeList = tradeList.sort((a, b) => a.timestamp - b.timestamp)

    const initSeed = { maxUsedCollateral: 0n, positions: {} } as { maxUsedCollateral: bigint, positions: { [k: string]: bigint } }



    const newLocal = sortedTradeList.flatMap(next => [...next.updateList, ...isTradeClosed(next) ? [next.closedPosition] : isTradeOpen(next) ? [] : [next.liquidatedPosition as IPositionLiquidated & { key: string }]]).sort((a, b) => a.timestamp - b.timestamp)
    
 

    const { maxUsedCollateral } = newLocal.reduce((seed, next) => {
      const prevCollateral = seed.positions[next.key] || 0n

      // if (account === '0xb791d1b51af954ee43a5ae1f1bcda360acfc075d') {
      //   console.log(formatReadableUSD(next.collateral))
      // }

      seed.positions[next.key] = next.__typename === 'UpdatePosition' ? next.collateral > prevCollateral ? next.collateral : prevCollateral : 0n

      const nextUsedCollateral = Object.values(seed.positions).reduce((s, n) => s + n, 0n)

      if (nextUsedCollateral > seed.maxUsedCollateral) {
        seed.maxUsedCollateral = nextUsedCollateral
      }

      return seed
    }, initSeed)



    const summary = sortedTradeList.reduce((seed, next): IAccountLadderSummary => {

      const hasSettled = isTradeSettled(next)

      const tradeMaxCollateral = next.updateList.reduce((s, n) => n.collateral > s ? n.collateral : s, 0n)
      const collateral = seed.maxCollateral + tradeMaxCollateral

      const indexTokenMarkPrice = BigInt(priceMap['_' + next.indexToken].c)
      const openDelta = isTradeOpen(next) ? getPnL(next.isLong, next.averagePrice, indexTokenMarkPrice, next.size) : 0n

      const fee = seed.fee + next.fee
      const realisedPnl = seed.realisedPnl + next.realisedPnl
      const openPnl = seed.openPnl + openDelta
      const pnl = openPnl + realisedPnl

      const usedMinProfit = maxUsedCollateral - pnl
      const maxCollateral = usedMinProfit > maxUsedCollateral ? usedMinProfit : maxUsedCollateral

      const roi = div(pnl, (maxCollateral > MIN_OF_MAX_COLLATERAL ? maxCollateral : MIN_OF_MAX_COLLATERAL))

      const winTradeCount = seed.winTradeCount + (pnl > 0n ? 1 : 0)
      const lossTradeCount = seed.lossTradeCount + (pnl < 0n ? 1 : 0)

      const settledTradeCount = hasSettled ? seed.settledTradeCount + 1 : seed.settledTradeCount

      const cumulativeLeverage = seed.cumulativeLeverage + div(next.size, maxCollateral)


      return {
        collateral, account, realisedPnl, openPnl, pnl, roi, maxCollateral,

        settledTradeCount,
        lossTradeCount,
        openTradeCount: 0,
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