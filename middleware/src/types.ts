import { ARBITRUM_CONTRACTS, SYMBOL } from "./address"
import { ExtractAndParseEventType } from "./contract"
import type { Vault } from "./contract/"

export type Address = string

export interface Token {
  name: string;
  symbol: SYMBOL;
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
  createdAt: Date
}

export interface IPosition extends IBaseEntity {
  key: string
  account: string
  collateralToken: string
  indexToken: ARBITRUM_CONTRACTS
  isLong: boolean
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

export interface IAggregateTrade extends IPosition {
  increases: IPositionIncrease[]
  decreases: IPositionDecrease[]
  updates: IPositionUpdate[]
}

export interface IAggregateSettledTrade extends IAggregateTrade {
  settlement: IPositionClose | IPositionLiquidated
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
  account: string
}

export interface LeaderboardApi extends HistoricalDataApi {
}

export interface IAccountAggregatedSummary {
  address: string
  realisedPnl: bigint
  openPnl: any
  leverage: bigint
  openSize: bigint
  settledPositionCount: number
  profitablePositionsCount: number
  claim: IClaim | null,
  aggTradeList: any
}

