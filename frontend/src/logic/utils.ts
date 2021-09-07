import {
  IPositionIncrease, IPositionLiquidated, IPositionClose, IAggregatedAccountSummary,
  IPositionUpdate, IBaseEntity, IAggregatedTradeSummary
} from "gambit-middleware"

function baseEntityJson<T extends  IBaseEntity>(json: T): T {
  return { ...json }
}

export function positonCloseJson(json: IPositionClose) {
  const realisedPnl = BigInt(json.realisedPnl)
  const collateral = BigInt(json.collateral)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl }
}

export function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json.collateral)
  const markPrice = BigInt(json.markPrice)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, markPrice, collateral }
}

export function positionDirJson(json: IPositionIncrease): IPositionIncrease {
  // const realisedPnl = BigInt(json.realisedPnl)
  const sizeDelta = BigInt(json.sizeDelta)
  const collateralDelta = BigInt(json.collateralDelta)

  return { ...baseEntityJson(json), sizeDelta, collateralDelta }
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

