import { BaseProvider } from "@ethersproject/providers"
import { Vault__factory } from "gmx-contracts"
import { ARBITRUM_ADDRESS, groupByMapMany } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, intervalInMsMap, MARGIN_FEE_BASIS_POINTS, MAX_LEVERAGE, USD_DECIMALS } from "./constant"
import { listen } from "./contract"
import { IAggregatedAccountSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeOpen, IPositionDelta, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IAbstractPosition, IAggregatedTradeSettledAll, IAggregatedTradeAll, IClaim, IClaimSource, IPositionClose, IPositionLiquidated } from "./types"
import { fillIntervalGap, formatFixed, isAddress, unixTimeTzOffset, UTCTimestamp } from "./utils"


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

export function calculateSettledPositionDelta(trade: IAggregatedTradeSettledAll): IPositionDelta {
  const settlement = trade.settledPosition
  const isLiq = isLiquidated(settlement)

  if (isLiq) {
    const { size, collateral } = settlement
    const averagePrice = settlement.markPrice

    return calculatePositionDelta(settlement.markPrice, settlement.isLong, { size, collateral, averagePrice })
  }

  const delta = settlement.realisedPnl
  const maxCollateral = trade.updateList.reduce((seed, b) => seed > b.collateral ? seed : b.collateral, 0n)

  return {
    delta,
    deltaPercentage: maxCollateral > 0n ? delta * BASIS_POINTS_DIVISOR / maxCollateral : 0n
  }
}


export function isTradeSettled(trade: IAggregatedTradeAll): trade is IAggregatedTradeSettledAll  {
  return 'settledPosition' in trade
}

export function isLiquidated(trade: IPositionClose | IPositionLiquidated): trade is IPositionLiquidated  {
  return 'markPrice' in trade
}


export function getLiquidationPriceFromDelta(collateral: bigint, size: bigint, averagePrice: bigint, isLong: boolean) {
  const liquidationAmount = size * BASIS_POINTS_DIVISOR / MAX_LEVERAGE

  const liquidationDelta = collateral - liquidationAmount
  const priceDelta = liquidationDelta * averagePrice / size

  return isLong ? averagePrice - priceDelta : averagePrice + priceDelta
}

export function getFundingFee(entryFundingRate: bigint, cumulativeFundingRate: bigint, size: bigint) {
  return (size * (cumulativeFundingRate - entryFundingRate)) / FUNDING_RATE_PRECISION
}


export function toAggregatedOpenTradeSummary<T extends IAggregatedTradeOpen>(trade: T): IAggregatedOpenPositionSummary<T> {
  const increaseFees = trade.increaseList.reduce((seed, pos) => seed += pos.fee, 0n)
  const decreaseFees = trade.decreaseList.reduce((seed, pos) => seed += pos.fee, 0n)


  const lastUpdate = trade.updateList[trade.updateList.length - 1]

  const collateral = lastUpdate.collateral
  const size = lastUpdate.size
  const cumulativeAccountData: IAggregatedOpenPositionSummary<T> = { collateral, size,
    account: trade.account,
    indexToken: trade.initialPosition.indexToken,
    startTimestamp: trade.initialPosition.indexedAt,
    fee: increaseFees + decreaseFees,
    averagePrice: lastUpdate.averagePrice,
    isLong: trade.initialPosition.isLong,
    leverage: formatFixed(size) / formatFixed(collateral),

    trade: trade
  }


  return cumulativeAccountData
}

export function toAggregatedTradeSettledSummary<T extends IAggregatedTradeClosed | IAggregatedTradeLiquidated>(trade: T): IAggregatedPositionSettledSummary<T> {
  const isLiq = isLiquidated(trade.settledPosition)
  const parsedAgg = toAggregatedOpenTradeSummary<T>(trade)

  const pnl = isLiq ? -BigInt(trade.settledPosition.collateral) : BigInt(trade.settledPosition.realisedPnl)
  const delta = calculateSettledPositionDelta(trade)

  const cumulativeAccountData: IAggregatedPositionSettledSummary<T> = {
    ...parsedAgg, pnl, delta,
    fee: isLiq ? 0n : parsedAgg.fee,
    realisedPnl: pnl - parsedAgg.fee,
    settledTimestamp: trade.indexedAt,
  }

  return cumulativeAccountData
}

export function toAggregatedAccountSummary(list: IAggregatedTradeSettledAll[]): IAggregatedAccountSummary[] {
  const settledListMap = groupByMapMany(list, a => a.initialPosition.account)
  const allPositions = Object.entries(settledListMap)

  const topMap = allPositions.reduce((seed, [account, allSettled]) => {

    let profitablePositionsCount = 0

    const tradeSummaries = allSettled.map(toAggregatedTradeSettledSummary)
    const fee = tradeSummaries.reduce((seed, pos) => seed + pos.fee, 0n)
    const pnl = tradeSummaries.reduce((seed, pos) => {
      if (pos.pnl > 0n) {
        profitablePositionsCount++
      }
      return seed + pos.pnl
    }, 0n)

    const delta = tradeSummaries.reduce((seed, pos) => {
      seed.delta += pos.delta.delta
      seed.deltaPercentage += pos.delta.deltaPercentage

      return seed
    }, <IPositionDelta>{ delta: 0n, deltaPercentage: 0n })


    const summary: IAggregatedAccountSummary = {
      account, fee, profitablePositionsCount, delta,
      settledPositionCount: allSettled.length,
      leverage: tradeSummaries.reduce((seed, pos) => seed + pos.leverage, 0) / tradeSummaries.length,
      claim: null,
      collateral: tradeSummaries.reduce((seed, pos) => seed + pos.collateral, 0n),
      pnl: pnl,
      realisedPnl: pnl - fee,
      size: tradeSummaries.reduce((sum, pos) => sum + pos.size, 0n),
      averagePrice: tradeSummaries.reduce((sum, pos) => sum + pos.averagePrice, 0n) / BigInt(tradeSummaries.length)
    }

    seed.push(summary)

    return seed
  }, [] as IAggregatedAccountSummary[])

  return topMap
}


export function historicalPnLMetric(list: Array<IAggregatedTradeClosed | IAggregatedTradeLiquidated>, interval: intervalInMsMap, ticks: number, endtime = Date.now() / 1000 | 0) {
  let accumulated = 0

  const intervalInSecs = Math.floor((interval / ticks) / 1000)
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

function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}

export function liquidationWeight(isLong: boolean, liquidationPriceUSD: bigint, markPriceUSD: bigint) {
  const weight = isLong ? liquidationPriceUSD * BASIS_POINTS_DIVISOR / markPriceUSD : markPriceUSD * BASIS_POINTS_DIVISOR / liquidationPriceUSD
  const newLocal = formatFixed(weight, 4)
  const value = easeInExpo(newLocal)
  return value > 1 ? 1 : value
}


export function validateIdentityName(name: string) {
  if (typeof name === 'string' && name.startsWith('@') && !(/^@?(\w){1,15}$/.test(name))) {
    throw new Error('Invalid twitter handle')
  }

  if (typeof name !== 'string' || name.length > 15 || String(name).length < 4) {
    throw new Error('Invalid name')
  }

}

export function parseTwitterClaim(account: string, name: string): IClaim {
  if (!isAddress(account)) {
    throw new Error('Invalid address')
  }

  validateIdentityName(name)

  return {
    name,
    account,
    data: '',
    sourceType: IClaimSource.TWITTER
  }
}


