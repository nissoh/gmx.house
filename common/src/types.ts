import { IAccountSummary, IChainParamApi, IPagePositionParamApi, ITimerangeParamApi } from "@gambitdao/gmx-middleware"

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

export type IQueryCompetitionApi = IPagePositionParamApi & ITimerangeParamApi & IChainParamApi