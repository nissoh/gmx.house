import { intervalInMsMap } from "."
import { ARBITRUM_CONTRACTS, TOKEN_SYMBOL } from "./address"
import { ExtractAndParseEventType } from "./contract"
import type { Vault } from "./contract/"

export type Address = string

export interface Token {
  name: string;
  symbol: TOKEN_SYMBOL;
  decimals: number;
  address: ARBITRUM_CONTRACTS;
}

export interface Transaction {
  token: Token,
  from: Address
  to: Address
  value: bigint
}



export interface IBaseEntity {
  id: string
}


export interface IPositionLiquidated extends IBaseEntity, ExtractAndParseEventType<Vault, 'LiquidatePosition'> { }

export interface IPositionIncrease extends IBaseEntity, ExtractAndParseEventType<Vault, 'IncreasePosition'> {
}

export interface IPositionDecrease extends IBaseEntity, ExtractAndParseEventType<Vault, 'DecreasePosition'> {
}

export interface IPositionUpdate extends IBaseEntity, ExtractAndParseEventType<Vault, 'UpdatePosition'> {
}

export interface IPositionClose extends IBaseEntity, ExtractAndParseEventType<Vault, 'ClosePosition'> {
}

export interface IClaim extends IBaseEntity {
  address: string
  latestClaimBlockNumber: number
  identity: string
}

export interface Account {
  address: string
  settledPositionCount: number
  profitablePositionsCount: number
  realisedPnl: bigint
  claim: IClaim | null
}

export interface HistoricalDataApi {
  timeRange?: [number, number]
}

export interface AccountHistoricalDataApi extends HistoricalDataApi {
  account?: string
}

export interface IPageable {
  offset: number
  pageSize: number
}

export interface IPagableResponse<T> extends IPageable {
  page: T[]
}

export interface ILeaderboardRequest extends IPageable {
  timeInterval: intervalInMsMap
}


export interface IAggregatedTradeOpen extends IBaseEntity {
  account: string
  initialPositionBlockTimestamp: number
  initialPosition: IPositionIncrease

  increaseList: IPositionIncrease[]
  decreaseList: IPositionDecrease[]
  updateList: IPositionUpdate[]
}

export interface IPositionDelta {
  delta: bigint
  hasProfit: boolean
  deltaPercentage: bigint
}

export interface IAggregatedTradeClosed extends IAggregatedTradeOpen {
  settledPosition: IPositionClose
  settledBlockTimestamp: number
}

export interface IAggregatedTradeLiquidated extends IAggregatedTradeOpen {
  settledPosition: IPositionLiquidated
  settledBlockTimestamp: number
}

export interface IAggregatedTradeSettledListMap {
  aggregatedTradeCloseds: IAggregatedTradeClosed[]
  aggregatedTradeLiquidateds: IAggregatedTradeLiquidated[]
}

export interface IAggregatedTradeListMap extends IAggregatedTradeSettledListMap {
  aggregatedTradeOpens: IAggregatedTradeOpen[]
}

export interface IAccountAggregationMap extends IBaseEntity, IAggregatedTradeListMap {
  totalRealisedPnl: bigint
}


export interface IAggregatedTradeSummary {
  size: bigint
  leverage: number
  collateral: bigint
  fee: bigint
  account: string
  averagePrice: bigint
}

export interface IAggregatedSettledTradeSummary extends IAggregatedTradeSummary {
  pnl: bigint
}

export interface IAggregatedPositionSummary extends IAggregatedTradeSummary {
  startTimestamp: number
  indexToken: ARBITRUM_CONTRACTS
  account: string
  isLong: boolean
}


export interface IAggregatedAccountSummary extends IAggregatedSettledTradeSummary {
  settledPositionCount: number
  profitablePositionsCount: number
  claim: IClaim | null,
  collateral: bigint

  // tradeSummaries: IAggregatedSettledTradeSummary[]
}

