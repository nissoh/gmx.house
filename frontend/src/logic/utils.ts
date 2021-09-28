import {
  IPositionIncrease, IPositionLiquidated, IPositionClose, IAggregatedAccountSummary,
  IPositionUpdate, IIdentifiableEntity, IAggregatedTradeOpen, IAccountAggregationMap, IPositionDecrease, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeOpenListMap, IAggregatedPositionSummary, IAggregatedTradeSummary, IAggregatedTradeSettledListMap
} from "gambit-middleware"




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

  return { ...json, fee, price, sizeDelta, collateralDelta }
}

export function positionDecreaseJson(json: IPositionDecrease): IPositionDecrease {
  const fee = BigInt(json?.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json?.sizeDelta)

  return { ...json, fee, price, sizeDelta }
}



export function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const collateral = BigInt(json?.collateral)
  const averagePrice = BigInt(json?.averagePrice)
  const size = BigInt(json?.size)
  const entryFundingRate = BigInt(json?.entryFundingRate)
  const realisedPnl = BigInt(json?.realisedPnl)
  const reserveAmount = BigInt(json?.reserveAmount)

  return { ...json, collateral, averagePrice, size, entryFundingRate, realisedPnl, reserveAmount, }
}

export function accountSummaryJson(json: IAggregatedAccountSummary): IAggregatedAccountSummary {
  const pnl = BigInt(json?.pnl)
  const fee = BigInt(json?.fee)
  const collateral = BigInt(json?.collateral)
  const size = BigInt(json?.size)
  const averagePrice = BigInt(json?.averagePrice)

  return { ...json, collateral, pnl, fee, size, averagePrice }
}


// IAggregatedTradeOpen
export function toAggregatedTradeOpenJson<T extends IAggregatedTradeOpen>(json: T): T {
  const indexedAt = Math.floor(json.indexedAt * 1000)

  const decreaseList = json.decreaseList?.map(positionDecreaseJson) || []
  const increaseList = json.increaseList?.map(positionIncreaseJson) || []
  const updateList = json.updateList?.map(positionUpdateJson) || []
  const initialPosition = positionIncreaseJson(json.initialPosition)

  return { ...json, indexedAt, decreaseList, increaseList, updateList, initialPosition }
}

export function toAggregatedTradeClosedJson(json: IAggregatedTradeClosed): IAggregatedTradeClosed {
  const indexedAt = Math.floor(json.indexedAt * 1000)

  const settledPosition = positonCloseJson(json.settledPosition)
  const initialPositionBlockTimestamp = Math.floor(json.initialPositionBlockTimestamp * 1000)

  return { ...toAggregatedTradeOpenJson(json), settledPosition, initialPositionBlockTimestamp, indexedAt }
}

export function toAggregatedTradeLiquidatedJson(json: IAggregatedTradeLiquidated): IAggregatedTradeLiquidated {
  const indexedAt = Math.floor(json.indexedAt * 1000)

  const settledPosition = positionLiquidatedJson(json.settledPosition)
  const initialPositionBlockTimestamp = Math.floor(json.initialPositionBlockTimestamp * 1000)

  return { ...toAggregatedTradeOpenJson(json), settledPosition, initialPositionBlockTimestamp, indexedAt }
}

export function toAggregatedTradeListJson<T extends IAggregatedTradeSettledListMap>(json: T): T {
  const aggregatedTradeCloseds = json.aggregatedTradeCloseds?.map(toAggregatedTradeClosedJson) || []
  const aggregatedTradeLiquidateds = json.aggregatedTradeLiquidateds?.map(toAggregatedTradeLiquidatedJson) || []
  // const aggregatedTradeOpens = json.aggregatedTradeOpens?.map(toAggregatedTradeOpenJson) || []

  return { ...json, aggregatedTradeCloseds, aggregatedTradeLiquidateds }
}

export function toAccountAggregationJson(json: IAccountAggregationMap): IAccountAggregationMap {
  const totalRealisedPnl = BigInt(json?.totalRealisedPnl)

  return { ...toAggregatedTradeListJson(json),  totalRealisedPnl  }
}

export function toAggregatedTradeSummary<T extends IAggregatedTradeSummary>(json: T): T {
  const size = BigInt(json.size)
  const collateral = BigInt(json.collateral)
  const fee = BigInt(json.fee)

  return { ...json, size, collateral, fee  }
}

export function toAggregatedPositionSummary(json: IAggregatedPositionSummary): IAggregatedPositionSummary {
  const averagePrice = BigInt(json.averagePrice)

  return { ...toAggregatedTradeSummary(json), averagePrice  }
}

