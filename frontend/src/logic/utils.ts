import { Account, IPositionIncrease, IPositionLiquidated, IPositionClose, IAggregateTrade, IAccountAggregatedSummary, IPositionUpdate, IAggregateSettledTrade, IBaseEntity } from "gambit-middleware"

function baseEntityJson<T extends  IBaseEntity>(json: T): T {
  const createdAt = new Date(json.createdAt)

  return { ...json, createdAt }
}

export function positonCloseJson(json: IPositionClose) {
  const realisedPnl = BigInt(json.realisedPnl)
  const collateral = BigInt(json.collateral)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const size = BigInt(json.size)
  const createdAt = new Date(json.createdAt)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl, createdAt }
}

export function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json.collateral)
  const markPrice = BigInt(json.markPrice)
  const createdAt = new Date(json.createdAt)
  const size = BigInt(json.size)

  return { ...baseEntityJson(json), size, markPrice, collateral, createdAt }
}

export function positionDirJson(json: IPositionIncrease): IPositionIncrease {
  // const realisedPnl = BigInt(json.realisedPnl)
  const createdAt = new Date(json.createdAt)
  const sizeDelta = BigInt(json.sizeDelta)
  const collateralDelta = BigInt(json.collateralDelta)

  return { ...baseEntityJson(json), sizeDelta, collateralDelta, createdAt }
}


export function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const createdAt = new Date(json.createdAt)
  const collateral = BigInt(json.collateral)
  const averagePrice = BigInt(json.averagePrice)
  const size = BigInt(json.size)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const realisedPnl = BigInt(json.realisedPnl)
  const reserveAmount = BigInt(json.reserveAmount)
  return { ...json, createdAt, collateral, averagePrice, size, entryFundingRate, realisedPnl, reserveAmount, }
}

export function leaderboardAccountJson(json: IAccountAggregatedSummary): IAccountAggregatedSummary {
  const leverage = BigInt(json.leverage)
  const openSize = BigInt(json.openSize)
  const realisedPnl = BigInt(json.realisedPnl)

  return { ...json, realisedPnl, leverage, openSize }
}

export function aggregatedTradeJson(json: IAggregateTrade): IAggregateTrade {
  const increases = json.increases.map(positionDirJson)
  const decreases = json.decreases.map(positionDirJson)
  const updates = json.updates.map(positionUpdateJson)
  const createdAt = new Date(json.createdAt)


  return { ...json, createdAt, decreases, increases, updates }
}


export function aggregatedSettledTradeJson(json: IAggregateSettledTrade): IAggregateSettledTrade {
  const settlement = 'markPrice' in json.settlement
    ? positionLiquidatedJson(json.settlement)
    : positonCloseJson(json.settlement)

  return { ...aggregatedTradeJson(json), settlement }
}

