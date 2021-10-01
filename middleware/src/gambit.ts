import { BaseProvider } from "@ethersproject/providers"
import { ARBITRUM_ADDRESS, groupByMapMany } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, intervalInMsMap, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE, USD_DECIMALS } from "./constant"
import { Vault__factory } from "./contract/index"
import { listen } from "./contract"
import { IAggregatedAccountSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeOpen, IAggregatedTradeSettledListMap, IPositionDelta, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IPositionUpdate, IAbstractPosition } from "./types"
import { fillIntervalGap, formatFixed, unixTimeTzOffset, UTCTimestamp } from "./utils"
import { fromJson } from "./fromJson"


export const gambitContract = (jsonProvider: BaseProvider) => {
  const contract = Vault__factory.connect(ARBITRUM_ADDRESS.Vault, jsonProvider)
  const vaultEvent = listen(contract)


  return {
    contract,
    address: ARBITRUM_ADDRESS.Vault,
    increasePosition: vaultEvent('IncreasePosition'),
    decreasePosition: vaultEvent('DecreasePosition'),
    updatePosition: vaultEvent('UpdatePosition'),
    closePosition: vaultEvent('ClosePosition'),
    liquidatePosition: vaultEvent('LiquidatePosition'),
    buyUSDG: vaultEvent('BuyUSDG'),
    swap: vaultEvent('Swap'),
    pnl: vaultEvent('UpdatePnl'),
  }
}

function getPositionCumulativeFundingFee(size: bigint, fundingRate: bigint) {
  return size * fundingRate / FUNDING_RATE_PRECISION
}

export function getPositionMarginFee(size: bigint) {
  return size - size * (BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR // TODO properly calculate cumulative fees
}



export function getLeverage (size = 0n, collateral = 0n, fundingRate = 0n) {
  const fundingFee = getPositionCumulativeFundingFee(size, fundingRate)
  const realised = collateral - fundingFee

  return size * BASIS_POINTS_DIVISOR / realised
}

export function priceDelta(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const priceDelta = positionPrice > price ? positionPrice - price : price - positionPrice
  const delta = size * priceDelta / positionPrice

  return delta * BASIS_POINTS_DIVISOR / collateral
}

export function priceDeltaPercentage(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const delta = priceDelta(positionPrice, price, collateral, size)
  return delta * BASIS_POINTS_DIVISOR / collateral
}



export function calculatePositionDelta(marketPrice: bigint, isLong: boolean, { size, collateral, averagePrice }: IAbstractPosition): IPositionDelta {
  const priceDelta = averagePrice > marketPrice ? averagePrice - marketPrice : marketPrice - averagePrice

  const hasProfit = isLong ? marketPrice > averagePrice : marketPrice < averagePrice

  const delta = hasProfit ? size * priceDelta / averagePrice : -(size * priceDelta / averagePrice)
  const deltaPercentage = delta * BASIS_POINTS_DIVISOR / collateral

  return { delta, deltaPercentage }
}
// export function calculatePositionDelta(marketPrice: bigint, isLong: boolean, { size, collateral, averagePrice }: IAbstractPosition): IPositionDelta {
//   const priceDelta = averagePrice > marketPrice ? averagePrice - marketPrice : marketPrice - averagePrice
//   let delta = size * priceDelta / averagePrice
//   const pendingDelta = delta

//   const hasProfit = isLong ? marketPrice > averagePrice : marketPrice < averagePrice
//   const minBps = 150n

//   if (hasProfit && delta * BASIS_POINTS_DIVISOR <= size * minBps) {
//     delta = 0n
//   }

//   const deltaPercentage = delta * BASIS_POINTS_DIVISOR / collateral
//   const pendingDeltaPercentage = pendingDelta * BASIS_POINTS_DIVISOR / collateral

//   return {
//     delta,
//     deltaPercentage,

//     pendingDelta,
//     pendingDeltaPercentage,

//     hasProfit,
//   }
// }



export function getLiquidationPriceFromDelta(collateral: bigint, size: bigint, averagePrice: bigint, isLong: boolean) {

  const liquidationAmount = size * BASIS_POINTS_DIVISOR / MAX_LEVERAGE

  const liquidationDelta = collateral - liquidationAmount
  const priceDelta = liquidationDelta * averagePrice / size

  return isLong ? averagePrice - priceDelta : averagePrice + priceDelta
}




export function toAggregatedOpenTradeSummary<T extends IAggregatedTradeOpen>(json: T): IAggregatedOpenPositionSummary<T> {
  const agg = fromJson.toAggregatedTradeOpenJson<T>(json)

  const increaseFees = agg.increaseList.reduce((seed, pos) => seed += pos.fee, 0n)
  const decreaseFees = agg.decreaseList.reduce((seed, pos) => seed += pos.fee, 0n)


  const lastUpdate = agg.updateList[agg.updateList.length - 1]

  const collateral = lastUpdate.collateral
  const size = lastUpdate.size
  const cumulativeAccountData: IAggregatedOpenPositionSummary<T> = { collateral, size,
    account: agg.account,
    indexToken: agg.initialPosition.indexToken,
    startTimestamp: agg.initialPosition.indexedAt,
    fee: increaseFees + decreaseFees,
    averagePrice: lastUpdate.averagePrice,
    isLong: agg.initialPosition.isLong,
    leverage: formatFixed(size) / formatFixed(collateral),

    trade: agg
  }


  return cumulativeAccountData
}

export function toAggregatedTradeSettledSummary<T extends IAggregatedTradeClosed | IAggregatedTradeLiquidated>(agg: T): IAggregatedPositionSettledSummary<T> {
  const isLiquidated = 'markPrice' in agg.settledPosition
  const parsedAgg = toAggregatedOpenTradeSummary<T>(agg)

  const pnl = isLiquidated ? -BigInt(agg.settledPosition.collateral) : BigInt(agg.settledPosition.realisedPnl)
  
  const cumulativeAccountData: IAggregatedPositionSettledSummary<T> = {
    ...parsedAgg, pnl,
    settledTimestamp: agg.indexedAt
  }

  return cumulativeAccountData
}

export function toAggregatedAccountSummary(list: IAggregatedTradeSettledListMap): IAggregatedAccountSummary[] {
  const settledListMap = groupByMapMany([...list.aggregatedTradeLiquidateds, ...list.aggregatedTradeCloseds], a => a.initialPosition.account)
  const allPositions = Object.entries(settledListMap)

  const topMap = allPositions.reduce((seed, [account, allSettled]) => {

    let profitablePositionsCount = 0

    const tradeSummaries = allSettled.map(toAggregatedTradeSettledSummary)
    const fee = tradeSummaries.reduce((seed, pos) => seed + BigInt(pos.fee), 0n)
    const realisedPnl = allSettled.reduce((seed, pos) => {
      if (pos.settledPosition.realisedPnl > 0n) {
        profitablePositionsCount++
      }
      return seed + BigInt(pos.settledPosition.realisedPnl)
    }, 0n)

    const summary: IAggregatedAccountSummary = {
      account, fee, profitablePositionsCount,
      settledPositionCount: allSettled.length,
      leverage: tradeSummaries.reduce((seed, pos) => seed + pos.leverage, 0) / tradeSummaries.length,
      claim: null,
      collateral: tradeSummaries.reduce((seed, pos) => seed + pos.collateral, 0n),
      pnl: realisedPnl,
      size: tradeSummaries.reduce((sum, pos) => sum + pos.size, 0n),
      averagePrice: tradeSummaries.reduce((sum, pos) => sum + pos.averagePrice, 0n) / BigInt(tradeSummaries.length)
    }

    seed.push(summary)

    return seed
  }, [] as IAggregatedAccountSummary[])

  return topMap.sort((a, b) => formatFixed(b.pnl - b.fee) - formatFixed(a.pnl - a.fee))
}


export function historicalPnLMetric(list: Array<IAggregatedTradeClosed | IAggregatedTradeLiquidated>, interval: intervalInMsMap, ticks: number, endtime = Date.now() / 1000 | 0) {
  let accumulated = 0

  const intervalInSecs = interval / 1000 | 0
  const initialDataStartTime = endtime - intervalInSecs * ticks
  const closedPosList = list
  // .filter(t => t.settledPosition)
    .map(aggTrade => {

      const summary = toAggregatedTradeSettledSummary(aggTrade)
      const time = aggTrade.initialPositionBlockTimestamp
      const value = formatFixed(summary.pnl - summary.fee, USD_DECIMALS)

      return { value, time }
    })

  const sortedParsed = closedPosList
    .filter(pos => pos.time > initialDataStartTime)
    .sort((a, b) => a.time - b.time)
    .map(x => {
      accumulated += x.value
      return { value: accumulated, time: x.time }
    })


  if (sortedParsed.length) {
    sortedParsed.push({ value: sortedParsed[sortedParsed.length - 1].value, time: endtime as UTCTimestamp })
  }


  const filled = sortedParsed
    .reduce(
      fillIntervalGap(
        intervalInSecs,
        (next) => {
          return { time: next.time, value: next.value }
        },
        (prev) => {
          return { time: prev.time, value: prev.value }
        },
        (prev, next) => {
          return { time: prev.time, value: next.value }
        }
      ),
      [{ time: initialDataStartTime, value: 0 }] as { time: number; value: number} []
    )
    .map(t => ({ time: unixTimeTzOffset(t.time), value: t.value }))
          

  return filled
}


