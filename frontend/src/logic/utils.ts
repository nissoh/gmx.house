import {
  IPositionIncrease, IPositionLiquidated, IPositionClose, IAggregatedAccountSummary,
  IPositionUpdate, IBaseEntity, IAggregatedTradeSummary, IAggregatedTradeOpen, IPosition, IQueryAggregatedTradeMap, IPositionDecrease, IAggregatedTradeClosed, IAggregatedTradeLiquidated
} from "gambit-middleware"

function baseEntityJson<T extends  IBaseEntity>(json: T): T {
  return { ...json }
}

export function positonCloseJson(json: IPositionClose) {
  const realisedPnl = BigInt(json.realisedPnl)
  const collateral = BigInt(json.collateral)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const averagePrice = BigInt(json.averagePrice)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl, averagePrice }
}

export function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json.collateral)
  const markPrice = BigInt(json.markPrice)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, markPrice, collateral }
}

export function positionIncreaseJson(json: IPositionIncrease): IPositionIncrease {
  const fee = BigInt(json.fee)
  const price = BigInt(json.price)
  const sizeDelta = BigInt(json.sizeDelta)
  const collateralDelta = BigInt(json.collateralDelta)

  return { ...json, fee, price, sizeDelta, collateralDelta }
}

export function positionDecreaseJson(json: IPositionDecrease): IPositionDecrease {
  const fee = BigInt(json.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json.sizeDelta)

  return { ...json, fee, price, sizeDelta }
}



export function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const collateral = BigInt(json.collateral)
  const averagePrice = BigInt(json.averagePrice)
  const size = BigInt(json.size)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const realisedPnl = BigInt(json.realisedPnl)
  const reserveAmount = BigInt(json.reserveAmount)
  return { ...json, collateral, averagePrice, size, entryFundingRate, realisedPnl, reserveAmount, }
}

export function accountSummaryJson(json: IAggregatedAccountSummary): IAggregatedAccountSummary {
  const leverage = BigInt(json.leverage)
  const realisedPnl = BigInt(json.realisedPnl)
  const fee = BigInt(json.fee)
  const openPnl = json.openPnl ? BigInt(json.openPnl) : null

  return { ...json, realisedPnl, leverage, fee, openPnl }
}

export function toAggregatedTradeSummaryJson(json: IAggregatedTradeSummary): IAggregatedTradeSummary {
  const startPositon = json.startTimestamp
  const size = BigInt(json.size)
  const collateral = BigInt(json.collateral)
  const pnl = BigInt(json.pnl)
  const fee = BigInt(json.fee)

  return { ...json, size, collateral, pnl, fee, startTimestamp: startPositon, }
}

// IAggregatedTradeOpen
export function toAggregatedTradeOpenJson<T extends IAggregatedTradeOpen>(json: T): T {
  const decreaseList = json.decreaseList?.map(positionDecreaseJson) || []
  const increaseList = json.increaseList?.map(positionIncreaseJson) || []
  const updateList = json.updateList?.map(positionUpdateJson) || []
  const initialPosition = positionIncreaseJson(json.initialPosition)
  const initialPositionBlockTimestamp = json.initialPositionBlockTimestamp * 1000

  return { ...json, initialPositionBlockTimestamp, decreaseList, increaseList, updateList, initialPosition }
}

export function toAggregatedTradeClosedJson(json: IAggregatedTradeClosed): IAggregatedTradeClosed {
  const settledPosition = positonCloseJson(json.settledPosition)
  const settledBlockTimestamp = json.settledBlockTimestamp * 1000

  return { ...toAggregatedTradeOpenJson(json), settledPosition, settledBlockTimestamp }
}

export function toAggregatedTradeLiquidatedJson(json: IAggregatedTradeLiquidated): IAggregatedTradeLiquidated {
  const settledPosition = positionLiquidatedJson(json.settledPosition)
  const settledBlockTimestamp = json.settledBlockTimestamp * 1000

  return { ...toAggregatedTradeOpenJson(json), settledPosition, settledBlockTimestamp }
}

export function toPositionIncreaseJson(json: IQueryAggregatedTradeMap): IQueryAggregatedTradeMap {
  const aggregatedTradeCloseds = json.aggregatedTradeCloseds?.map(toAggregatedTradeClosedJson) || []
  const aggregatedTradeLiquidateds = json.aggregatedTradeLiquidateds?.map(toAggregatedTradeLiquidatedJson) || []
  const aggregatedTradeOpens = json.aggregatedTradeOpens?.map(toAggregatedTradeOpenJson) || []


  return { ...json, aggregatedTradeCloseds, aggregatedTradeLiquidateds, aggregatedTradeOpens }
}

