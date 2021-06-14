import type { dto } from "gambit-backend"

export type SettledPosition = InstanceType<typeof dto.PositionClose>
export type Claim = InstanceType<typeof dto.Claim>
export type PositionIncrease = InstanceType<typeof dto.PositionIncrease>
export type PositionLiquidated = InstanceType<typeof dto.PositionLiquidated>

export interface Tournament {
  closedPositions: SettledPosition[]
  liquidatedPositions: PositionLiquidated[]
}

export interface Account {
  address: string
  settledPositionCount: number
  profitablePositionsCount: number
  realisedPnl: bigint
  claim: Claim | null
  settledPositions: SettledPosition[]
}
