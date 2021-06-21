import { PositionIncrease, PositionLiquidated, SettledPosition } from "./types"


export function positonCloseJson(json: SettledPosition) {
  const realisedPnl = BigInt(json.realisedPnl)
  const collateral = BigInt(json.collateral)
  const entryFundingRate = BigInt(json.entryFundingRate)
  const size = BigInt(json.size)
  const createdAt = new Date(json.createdAt)

  return { ...json, size, collateral, entryFundingRate, realisedPnl, createdAt }
}

export function positionLiquidatedJson(json: PositionLiquidated) {
  const collateral = BigInt(json.collateral)
  const markPrice = BigInt(json.markPrice)
  const createdAt = new Date(json.createdAt)

  return { ...json, markPrice, collateral, createdAt }
}

export function positionIncreaseJson(json: PositionIncrease) {
  // const realisedPnl = BigInt(json.realisedPnl)
  const createdAt = new Date(json.createdAt)

  return { ...json, createdAt }
}

