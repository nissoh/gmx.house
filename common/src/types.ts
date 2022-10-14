import { IAccountSummary } from "@gambitdao/gmx-middleware"

export interface IAccountLadderSummary extends IAccountSummary {
  roi: bigint
}