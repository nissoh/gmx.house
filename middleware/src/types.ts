import { intervalInMsMap } from "."
import { ARBITRUM_ADDRESS, ARBITRUM_TRADEABLE_ADDRESS, TOKEN_SYMBOL } from "./address"
import { ExtractAndParseEventType } from "./contract"
import type { Vault } from "./contract/"

export type Address = string

export interface TokenAbstract {
  name: string
  symbol: TOKEN_SYMBOL
  decimals: number
}
export interface Token extends TokenAbstract {
  address: ARBITRUM_ADDRESS
}

export interface TradeableToken extends TokenAbstract {
  address: ARBITRUM_TRADEABLE_ADDRESS
}

export interface Transaction {
  token: Token,
  from: Address
  to: Address
  value: bigint
}


export const CHAINLINK_USD_FEED_ADRESS = {
  [ARBITRUM_TRADEABLE_ADDRESS.WBTC]: "0xae74faa92cb67a95ebcab07358bc222e33a34da7",
  [ARBITRUM_TRADEABLE_ADDRESS.WETH]: "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
  // [TOKEN_SYMBOL.BNB]: "0xc45ebd0f901ba6b2b8c7e70b717778f055ef5e6d",
  [ARBITRUM_TRADEABLE_ADDRESS.LINK]: "0xdfd03bfc3465107ce570a0397b247f546a42d0fa",
  [ARBITRUM_TRADEABLE_ADDRESS.UNI]: "0x68577f915131087199fe48913d8b416b3984fd38",
}


export interface IIdentifiableEntity {
  id: string
}
export interface IBaseEntityIndexed extends IIdentifiableEntity {
  indexedAt: number
}

export type IPositionLiquidated = IBaseEntityIndexed & Omit<ExtractAndParseEventType<Vault, 'LiquidatePosition'>, 'indexToken'> & { indexToken: ARBITRUM_TRADEABLE_ADDRESS }
export type IPositionIncrease = IBaseEntityIndexed & Omit<ExtractAndParseEventType<Vault, 'IncreasePosition'>, 'indexToken'> & { indexToken: ARBITRUM_TRADEABLE_ADDRESS }
export type IPositionDecrease = IBaseEntityIndexed & Omit<ExtractAndParseEventType<Vault, 'DecreasePosition'>, 'indexToken'> & { indexToken: ARBITRUM_TRADEABLE_ADDRESS }
export type IPositionUpdate = IBaseEntityIndexed & Omit<ExtractAndParseEventType<Vault, 'UpdatePosition'>, 'indexToken'> & { indexToken: ARBITRUM_TRADEABLE_ADDRESS }
export type IPositionClose = IBaseEntityIndexed & Omit<ExtractAndParseEventType<Vault, 'ClosePosition'>, 'indexToken'> & { indexToken: ARBITRUM_TRADEABLE_ADDRESS }




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

export interface IPageChainlinkPricefeed extends Partial<IPageable>, Partial<ISortable>, ITimerange {
  feedAddress: string
}

export interface ILeaderboardRequest extends IPageable {
  timeInterval: intervalInMsMap.DAY | intervalInMsMap.WEEK | intervalInMsMap.MONTH
}
export interface AccountHistoricalDataApi extends IAccountQueryParamApi {
  timeInterval: intervalInMsMap
}

export enum TradeDirection {
  SHORT = 'short',
  LONG = 'long'
}

export enum TradeType {
  OPEN = 'open',
  CLOSED = 'closed',
  LIQUIDATED = 'liquidated',
}
export interface IRequestAggregatedTradeQueryparam extends IIdentifiableEntity {
  tradeType: TradeType,
}

export interface IAggregatedTradeOpen extends IBaseEntityIndexed {
  account: string

  initialPosition: IPositionIncrease

  increaseList: IPositionIncrease[]
  decreaseList: IPositionDecrease[]
  updateList: IPositionUpdate[]
}

export interface IPositionDelta {
  delta: bigint
  deltaPercentage: bigint
}

export interface IAggregatedTradeSettled<T extends IBaseEntityIndexed> extends IAggregatedTradeOpen {
  settledPosition: T
  initialPositionBlockTimestamp: number
}

export interface IAggregatedTradeClosed extends IAggregatedTradeSettled<IPositionClose> { }

export interface IAggregatedTradeLiquidated extends IAggregatedTradeSettled<IPositionLiquidated> { }

export type IAggregatedTradeSettledAll = IAggregatedTradeClosed | IAggregatedTradeLiquidated
export type IAggregatedTradeAll = IAggregatedTradeSettledAll | IAggregatedTradeOpen

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

export interface IAbstractPosition {
  size: bigint
  collateral: bigint
  averagePrice: bigint
}

export interface IAggregatedTradeSummary extends IAbstractPosition {
  fee: bigint
  account: string
  leverage: number
}

export interface IAggregatedSettledTradeSummary extends IAggregatedTradeSummary {
  pnl: bigint
}


export interface IAggregatedOpenPositionSummary<A extends IAggregatedTradeOpen = IAggregatedTradeOpen> extends IAggregatedTradeSummary {
  startTimestamp: number
  indexToken: ARBITRUM_TRADEABLE_ADDRESS
  account: string
  isLong: boolean
  averagePrice: bigint

  trade: A
}

export interface IAggregatedPositionSettledSummary<A extends IAggregatedTradeSettledAll = IAggregatedTradeSettledAll> extends IAggregatedOpenPositionSummary<A>, IAggregatedSettledTradeSummary {
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
