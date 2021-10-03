import { O } from "@aelea/utils"
import { toAggregatedOpenTradeSummary, toAggregatedTradeSettledSummary } from "./gambit"
import {
  IAccountAggregationMap, IAggregatedAccountSummary, IAggregatedPositionSettledSummary,
  IAggregatedOpenPositionSummary, IAggregatedTradeClosed,
  IAggregatedTradeLiquidated, IAggregatedTradeOpen, IAggregatedTradeSettledListMap,
  IAggregatedTradeSummary, IIdentifiableEntity, IPositionClose, IPositionDecrease,
  IPositionIncrease, IPositionLiquidated, IPositionUpdate, IAggregatedTradeSettledAll
} from "./types"



function baseEntityJson<T extends  IIdentifiableEntity>(json: T): T {
  return { ...json }
}

export function positonCloseJson(json: IPositionClose) {
  const realisedPnl = BigInt(json?.realisedPnl)
  const collateral = BigInt(json?.collateral)
  const entryFundingRate = BigInt(json?.entryFundingRate)
  const averagePrice = BigInt(json?.averagePrice)
  const size = BigInt(json?.size)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl, averagePrice }
}

export function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json?.collateral)
  const markPrice = BigInt(json?.markPrice)
  const size = BigInt(json?.size)

  return { ...baseEntityJson(json), size, markPrice, collateral }
}

export function positionIncreaseJson(json: IPositionIncrease): IPositionIncrease {
  const fee = BigInt(json?.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json?.sizeDelta)
  const collateralDelta = BigInt(json?.collateralDelta)

  return { ...json, fee, price, sizeDelta, collateralDelta, }
}

export function positionDecreaseJson(json: IPositionDecrease): IPositionDecrease {
  const fee = BigInt(json?.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json?.sizeDelta)
  const collateralDelta = BigInt(json?.collateralDelta)

  return { ...json, fee, price, sizeDelta, collateralDelta, }
}



export function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const collateral = BigInt(json?.collateral)
  const averagePrice = BigInt(json?.averagePrice)
  const size = BigInt(json?.size)
  const entryFundingRate = BigInt(json?.entryFundingRate)
  const realisedPnl = BigInt(json?.realisedPnl)
  const reserveAmount = BigInt(json?.reserveAmount)

  return { ...json, collateral, averagePrice, size, entryFundingRate, realisedPnl, reserveAmount }
}

export function accountSummaryJson(json: IAggregatedAccountSummary): IAggregatedAccountSummary {
  const pnl = BigInt(json?.pnl)
  const fee = BigInt(json?.fee)
  const collateral = BigInt(json?.collateral)
  const size = BigInt(json?.size)

  return { ...json, collateral, pnl, fee, size, }
}


export function toAggregatedTradeOpenJson<T extends IAggregatedTradeOpen>(json: T): T {
  const decreaseList = json.decreaseList?.map(positionDecreaseJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const increaseList = json.increaseList?.map(positionIncreaseJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const updateList = json.updateList?.map(positionUpdateJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const initialPosition = positionIncreaseJson(json.initialPosition)

  return { ...json, decreaseList, increaseList, updateList, initialPosition }
}

export function toAggregatedTradeClosedJson(json: IAggregatedTradeClosed): IAggregatedTradeClosed {
  const settledPosition = positonCloseJson(json.settledPosition)

  return { ...toAggregatedTradeOpenJson(json), settledPosition }
}

export function toAggregatedTradeLiquidatedJson(json: IAggregatedTradeLiquidated): IAggregatedTradeLiquidated {
  const settledPosition = positionLiquidatedJson(json.settledPosition)

  return { ...toAggregatedTradeOpenJson(json), settledPosition, }
}

export function toAggregatedTradeListJson<T extends IAggregatedTradeSettledListMap>(json: T): T {
  const aggregatedTradeCloseds = json.aggregatedTradeCloseds?.map(toAggregatedTradeClosedJson) || []
  const aggregatedTradeLiquidateds = json.aggregatedTradeLiquidateds?.map(toAggregatedTradeLiquidatedJson) || []
  // const aggregatedTradeOpens = json.aggregatedTradeOpens?.map(toAggregatedTradeOpenJson) || []

  return { ...json, aggregatedTradeCloseds, aggregatedTradeLiquidateds }
}

export function toAccountAggregationJson(json: IAccountAggregationMap): IAccountAggregationMap {
  const totalRealisedPnl = BigInt(json?.totalRealisedPnl)

  return { ...toAggregatedTradeListJson(json), totalRealisedPnl  }
}

export function toAggregatedTradeSummary<T extends IAggregatedTradeSummary>(json: T): T {
  const size = BigInt(json.size)
  const collateral = BigInt(json.collateral)
  const fee = BigInt(json.fee)

  return { ...json, size, collateral, fee  }
}

export function toAggregatedPositionSummary<T extends IAggregatedOpenPositionSummary>(json: T): IAggregatedOpenPositionSummary {
  const averagePrice = BigInt(json.averagePrice)

  return { ...toAggregatedTradeSummary(json), averagePrice  }
}

export function toAggregatedPositionSettledSummary<T extends IAggregatedPositionSettledSummary<IAggregatedTradeSettledAll>>(json: T): T {
  const averagePrice = BigInt(json.averagePrice)

  // @ts-ignore
  const trade =  'markPrice' in json.trade.settledPosition ? toAggregatedTradeClosedJson(json.trade) : toAggregatedTradeLiquidatedJson(json.trade)

  return { ...toAggregatedTradeSummary(json), trade, averagePrice  }
}

export function toAggregatedSettledTrade<T extends IAggregatedTradeClosed | IAggregatedTradeLiquidated>(json: T): T {
  const trade = 'markPrice' in json.settledPosition // @ts-ignore
    ? toAggregatedTradeLiquidatedJson(json) // @ts-ignore
    : toAggregatedTradeClosedJson(json)

  // @ts-ignore
  return trade
}





export const fromJson = {
  positonCloseJson,
  positionLiquidatedJson,
  positionIncreaseJson,
  positionDecreaseJson,
  positionUpdateJson,
  accountSummaryJson,
  toAggregatedTradeOpenJson,
  toAggregatedTradeClosedJson,
  toAggregatedTradeLiquidatedJson,
  toAggregatedTradeListJson,
  toAccountAggregationJson,
  toAggregatedTradeSummary,
  toAggregatedPositionSummary,
  toAggregatedPositionSettledSummary,
  toAggregatedSettledTrade,
  toAggregatedOpenTradeSummary: O(toAggregatedTradeOpenJson, toAggregatedOpenTradeSummary),
  toAggregatedTradeSettledSummary: O(toAggregatedSettledTrade, toAggregatedTradeSettledSummary),
}