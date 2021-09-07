import { BaseProvider } from "@ethersproject/providers"
import { ARBITRUM_CONTRACTS, groupByMapMany } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, MARGIN_FEE_BASIS_POINTS } from "./constant"
import { Vault__factory } from "./contract/index"
import { listen } from "./contract"
import { IAggregatedAccountSummary, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeOpen, IAggregatedTradeSummary, IQueryAggregatedTradeMap } from "./types"


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

export function getPositionFee(size: bigint, fundingRate: bigint) {
  const fundingFee = getPositionCumulativeFundingFee(size, fundingRate)
  const marginFee = getPositionMarginFee(size)

  return marginFee + fundingFee
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

export function toAggregatedTradeAverageSummary(agg: IAggregatedTradeClosed | IAggregatedTradeLiquidated): IAggregatedTradeSummary {
  const cumulativeAccountData: IAggregatedTradeSummary = {
    indexToken: agg.initialPosition.indexToken as ARBITRUM_CONTRACTS,
    startTimestamp: agg.initialPositionBlockTimestamp,
    leverage: 0n, pnl: 0n, size: 0n, collateral: 0n, fee: 0n,
    isLong: agg.initialPosition.isLong
  }

  agg.increaseList?.forEach((pos) => {
    cumulativeAccountData.size += BigInt(pos.sizeDelta)
    cumulativeAccountData.collateral += BigInt(pos.collateralDelta)
    cumulativeAccountData.fee += BigInt(pos.fee)
    cumulativeAccountData.leverage += BigInt(pos.sizeDelta) / BigInt(pos.collateralDelta)
  })

  cumulativeAccountData.leverage = cumulativeAccountData.leverage / BigInt(agg.increaseList.length)
  
  agg.decreaseList?.forEach((pos) => {
    cumulativeAccountData.fee += BigInt(pos.fee)
  })

  return cumulativeAccountData
}

export function toAggregatedAccountSummary(list: IQueryAggregatedTradeMap): IAggregatedAccountSummary[] {
  // const closedListMap = groupByMapMany(list.aggregatedTradeCloseds, a => a.initialPosition.account)
  // const liqListMap = groupByMapMany(list.aggregatedTradeLiquidateds, a => a.initialPosition.account)

  const settledListMap = groupByMapMany([...list.aggregatedTradeLiquidateds, ...list.aggregatedTradeCloseds], a => a.initialPosition.account)
  // const openListMap = groupByMapMany(list.aggregatedTradeOpens, a => a.initialPosition.account)

  const allPositions = Object.entries(settledListMap)

  const topMap = allPositions.reduce((seed, [address, aggTradeList]) => {

    let profitablePositionsCount = 0

    const tradeSummaries = aggTradeList.map(toAggregatedTradeAverageSummary)
    const fee = tradeSummaries.reduce((seed, pos) => seed + BigInt(pos.fee), 0n)
    const realisedPnl = aggTradeList.reduce((seed, pos) => {
      if (pos.settledPosition.realisedPnl > 0n) {
        profitablePositionsCount++
      }

      return seed + BigInt(pos.settledPosition.realisedPnl)
    }, 0n)


    const account: IAggregatedAccountSummary = {
      address, tradeSummaries, fee, profitablePositionsCount,
      settledPositionCount: aggTradeList.length,
      leverage: tradeSummaries.reduce((seed, pos) => seed + pos.leverage, 0n) / BigInt(tradeSummaries.length),
      openPnl: null,
      claim: null,
      realisedPnl: realisedPnl - fee,
    }

    seed.push(account)

    return seed
  }, [] as IAggregatedAccountSummary[])

  return topMap.sort((a, b) => Number(b.realisedPnl) - Number(a.realisedPnl))
}

