import { AVALANCHE_TRADEABLE_ADDRESS, IAccountSummary } from "@gambitdao/gmx-middleware"

export interface IAccountLadderSummary extends IAccountSummary {
  performancePercentage: bigint
  roi: bigint
  maxCollateral: bigint
  openPnl: bigint
  pnl: bigint


  usedCollateralMap: {
    [k: string]: bigint
  }
}