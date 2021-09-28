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


export enum CHAINLINK_USD_FEED_ADRESS {
  BTC = "0xae74faa92cb67a95ebcab07358bc222e33a34da7",
  ETH = "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
  BNB = "0xc45ebd0f901ba6b2b8c7e70b717778f055ef5e6d",
  LINK = "0xdfd03bfc3465107ce570a0397b247f546a42d0fa",
  UNI = "0x68577f915131087199fe48913d8b416b3984fd38",
}


export interface IIdentifiableEntity {
  id: string
}
export interface IBaseEntityIndexed extends IIdentifiableEntity {
  indexedAt: number
}

export interface IPositionLiquidated extends IBaseEntityIndexed, ExtractAndParseEventType<Vault, 'LiquidatePosition'> { }

export interface IPositionIncrease extends IBaseEntityIndexed, ExtractAndParseEventType<Vault, 'IncreasePosition'> {
}

export interface IPositionDecrease extends IBaseEntityIndexed, ExtractAndParseEventType<Vault, 'DecreasePosition'> {
}

export interface IPositionUpdate extends IBaseEntityIndexed, ExtractAndParseEventType<Vault, 'UpdatePosition'> {
}

export interface IPositionClose extends IBaseEntityIndexed, ExtractAndParseEventType<Vault, 'ClosePosition'> {
}

export interface IClaim extends IIdentifiableEntity {
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

export interface IAccountQueryParamApi {
  account: string
}

export interface ITimerange {
  from: number
  to: number
}

export interface IPageable {
  offset: number
  pageSize: number
}

export interface ISortable {
  orderBy: string
  orderDirection: 'desc' | 'asc'
}

export interface IPagableResponse<T> extends IPageable {
  page: T[]
}

export interface IPageChainlinkPricefeed extends Partial<IPageable>, Partial<ISortable> {
  feedAddress: CHAINLINK_USD_FEED_ADRESS,
  settledTradeId: string
}

export interface ILeaderboardRequest extends IPageable {
  timeInterval: intervalInMsMap
}
export interface AccountHistoricalDataApi extends IAccountQueryParamApi {
  timeInterval: intervalInMsMap
}


export interface IAggregatedTradeOpen extends IBaseEntityIndexed {
  account: string
  indexedAt: number

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

export interface IAggregatedTradeSettled<T extends IBaseEntityIndexed> extends IAggregatedTradeOpen {
  settledPosition: T
  initialPositionBlockTimestamp: number
}

export interface IAggregatedTradeClosed extends IAggregatedTradeSettled<IPositionClose> { }

export interface IAggregatedTradeLiquidated extends IAggregatedTradeSettled<IPositionLiquidated> { }

export type IAggregatedTradeSettledAll = IAggregatedTradeSettled<IPositionClose | IPositionLiquidated>

export interface IAggregatedTradeSettledListMap {
  aggregatedTradeCloseds: IAggregatedTradeClosed[]
  aggregatedTradeLiquidateds: IAggregatedTradeLiquidated[]
}

export interface IAggregatedTradeOpenListMap {
  aggregatedTradeOpens: IAggregatedTradeOpen[]
}

export interface IAccountAggregationMap extends IBaseEntityIndexed, IAggregatedTradeOpenListMap, IAggregatedTradeSettledListMap {
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

export interface IAggregatedPositionSummaryAbstract extends IAggregatedTradeSummary {
  startTimestamp: number
  indexToken: ARBITRUM_CONTRACTS
  account: string
  isLong: boolean
}

export interface IAggregatedPositionSummary extends IAggregatedPositionSummaryAbstract, IAggregatedTradeSummary {}

export interface IAggregatedPositionSettledSummary extends IAggregatedPositionSummaryAbstract, IAggregatedSettledTradeSummary {
  settledTimestamp: number
}


export interface IAggregatedAccountSummary extends IAggregatedSettledTradeSummary {
  settledPositionCount: number
  profitablePositionsCount: number
  claim: IClaim | null,
  collateral: bigint

  // tradeSummaries: IAggregatedSettledTradeSummary[]
}

export interface IChainlinkPrice {
  unixTimestamp: number
  value: string
}
