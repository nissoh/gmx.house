import { IAccountSummary, IChainParamApi, IPagePositionParamApi, ITimerangeParamApi } from "@gambitdao/gmx-middleware"

export interface IAccountLadderSummary extends IAccountSummary {
  lossTradeCount: number
  performancePercentage: bigint
  roi: bigint
  maxCollateral: bigint
  openPnl: bigint
  pnl: bigint
  cumulativeLeverage: bigint
}

export type IQueryCompetitionApi = IPagePositionParamApi & ITimerangeParamApi & IChainParamApi