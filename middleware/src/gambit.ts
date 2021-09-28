import { BaseProvider } from "@ethersproject/providers"
import { ARBITRUM_CONTRACTS, groupByMapMany } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, intervalInMsMap, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE, USD_DECIMALS } from "./constant"
import { Vault__factory } from "./contract/index"
import { listen } from "./contract"
import { IAggregatedAccountSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedSettledTradeSummary, IAccountAggregationMap, IAggregatedTradeOpen, IAggregatedTradeSettledListMap, IPositionDelta, IAggregatedPositionSummary, IAggregatedPositionSettledSummary } from "./types"
import { fillIntervalGap, formatFixed, timeTzOffset, UTCTimestamp } from "./utils"


export const gambitContract = (jsonProvider: BaseProvider) => {
  const contract = Vault__factory.connect(ARBITRUM_CONTRACTS.Vault, jsonProvider)
  const vaultEvent = listen(contract)


  return {
    contract,
    address: ARBITRUM_CONTRACTS.Vault,
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

export function priceDeltaPercentage2(delta: bigint, collateral: bigint) {
  // const delta = priceDelta(positionPrice, price, collateral, size)
  return delta * BASIS_POINTS_DIVISOR / collateral
}

export function calculatePositionDelta(size: bigint, collateral: bigint, isLong: boolean, marketPrice: bigint, positionPrice: bigint): IPositionDelta {
  const priceDelta = marketPrice > positionPrice ? marketPrice - positionPrice : positionPrice - marketPrice
  const delta = size * priceDelta / marketPrice

  const hasProfit = isLong ? positionPrice > marketPrice : positionPrice < marketPrice
  const minBps = 150n

  // if (hasProfit && delta * BASIS_POINTS_DIVISOR >=  size * minBps) {
  //   delta = 0n
  // }

  const deltaPercentage = delta * BASIS_POINTS_DIVISOR / collateral

  return {
    delta,
    hasProfit,
    deltaPercentage
  }
}

export function getLiquidationPriceFromDelta(collateral: bigint, size: bigint, averagePrice: bigint, isLong: boolean) {

  const liquidationAmount = size * BASIS_POINTS_DIVISOR / MAX_LEVERAGE

  const liquidationDelta = collateral - liquidationAmount
  const priceDelta = liquidationDelta * averagePrice / size

  return isLong ? averagePrice - priceDelta : averagePrice + priceDelta
}


// for longs: nextAveragePrice = (nextPrice * nextSize)/ (nextSize + delta)
// for shorts: nextAveragePrice = (nextPrice * nextSize) / (nextSize - delta)
// export function getNextAveragePrice(address: string, size: bigint, marketPrice: bigint, positionPrice: bigint, isLong: boolean, sizeDelta: bigint, lastIncreasedTime: bigint) {
//     const {hasProfit, delta} = calculatePositionDelta(size, )
//     uint256 nextSize = _size.add(_sizeDelta);
//     uint256 divisor;
//     if (_isLong) {
//         divisor = hasProfit ? nextSize.add(delta) : nextSize.sub(delta);
//     } else {
//         divisor = hasProfit ? nextSize.sub(delta) : nextSize.add(delta);
//     }
//     return _nextPrice.mul(nextSize).div(divisor);
// }

export function toAggregatedOpenTradeSummary(agg: IAggregatedTradeOpen): IAggregatedPositionSummary {
  const cumulativeAccountData: IAggregatedPositionSummary = {
    account: agg.account,
    indexToken: agg.initialPosition.indexToken as ARBITRUM_CONTRACTS,
    startTimestamp: agg.indexedAt,
    size: 0n, collateral: 0n, fee: 0n,
    averagePrice: 0n,
    isLong: agg.initialPosition.isLong,
    leverage: 0
  }

  agg.increaseList?.forEach((pos) => {
    cumulativeAccountData.size += BigInt(pos.sizeDelta)
    cumulativeAccountData.collateral += BigInt(pos.collateralDelta)
    cumulativeAccountData.fee += BigInt(pos.fee)
  })

  const updateListLength = agg.updateList?.length
  if (updateListLength) {
    cumulativeAccountData.averagePrice = BigInt(agg.updateList[updateListLength - 1].averagePrice) ?? 0n
  } else {
    console.error(`missing updatelist, account: ${agg.account}`)
  }
  
  agg?.decreaseList?.forEach((pos) => {
    cumulativeAccountData.fee += BigInt(pos.fee)
  })

  cumulativeAccountData.leverage = formatFixed(cumulativeAccountData.size) / formatFixed(cumulativeAccountData.collateral)

  return cumulativeAccountData
}

export function toAggregatedTradeSettledSummary(agg: IAggregatedTradeClosed | IAggregatedTradeLiquidated): IAggregatedPositionSettledSummary {
  const cumulativeAccountData: IAggregatedPositionSettledSummary = {
    ...toAggregatedOpenTradeSummary(agg),
    pnl: 0n,
    settledTimestamp: agg.initialPositionBlockTimestamp,
  }

  const isLiquidated = 'markPrice' in agg.settledPosition

  cumulativeAccountData.pnl = isLiquidated
    ? BigInt(-agg.settledPosition.collateral)
    : BigInt(agg.settledPosition.realisedPnl) - cumulativeAccountData.fee
  

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
      averagePrice: tradeSummaries.reduce((sum, pos) => sum + pos.averagePrice, 0n) / BigInt(tradeSummaries.length),
    }

    seed.push(summary)

    return seed
  }, [] as IAggregatedAccountSummary[])

  return topMap.sort((a, b) => formatFixed(b.pnl - b.fee) - formatFixed(a.pnl - a.fee))
}


export function historicalPnLMetric(list: Array<IAggregatedTradeClosed | IAggregatedTradeLiquidated>, interval: intervalInMsMap, ticks: number, endtime = Date.now()) {
  let accumulated = 0

  const initialDataStartTime = endtime - interval * ticks
  const closedPosList = list
  // .filter(t => t.settledPosition)
    .map(aggTrade => {

      const summary = toAggregatedTradeSettledSummary(aggTrade)
      const time = aggTrade.initialPositionBlockTimestamp
      const value = formatFixed(summary.pnl, USD_DECIMALS)

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
        interval,
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
    .map(t => ({ time: timeTzOffset(t.time), value: t.value }))
          

  return filled
}


