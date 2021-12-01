import { gql, TypedDocumentNode } from "@urql/core"
import { IAccountAggregationMap, IPageable, ITimerange, IAccountQueryParamApi, IAggregatedTradeOpenListMap, IAggregatedTradeSettledListMap, IAggregatedTradeLiquidated, IIdentifiableEntity, IAggregatedTradeOpen, IAggregatedTradeClosed, IChainlinkPrice, IPageChainlinkPricefeed } from "@gambitdao/gmx-middleware"




const schemaFragments = `

fragment increasePositionFields on IncreasePosition {
  id
  account

  indexedAt

  collateralToken
  indexToken
  key
  isLong
  collateralDelta
  sizeDelta
  price
  fee
}

fragment decreasePositionFields on DecreasePosition {
  id
  indexedAt

  account
  collateralToken
  indexToken
  isLong
  collateralDelta
  sizeDelta
  price
  fee
}

fragment updatePositionFields on UpdatePosition {
  id

  indexedAt
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment closePositionFields on ClosePosition {
  id

  indexedAt

  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment liquidatePositionFields on LiquidatePosition {
  id

  indexedAt

  account
  collateralToken
  indexToken
  isLong
  size
  collateral
  reserveAmount
  realisedPnl
  markPrice
}

fragment aggregatedTradeClosedFields on AggregatedTradeClosed {
  id
  indexedAt

  account

  indexedAt

  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }

  settledPosition {
    ...closePositionFields
  }

  settledPosition { ...closePositionFields }
  initialPosition { ...increasePositionFields }
  settledPosition { ...closePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment aggregatedTradeLiquidatedFields on AggregatedTradeLiquidated {
  id
  indexedAt

  account

  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }

  settledPosition { ...liquidatePositionFields }
  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment aggregatedTradeOpenFields on AggregatedTradeOpen {
  id
  indexedAt

  account

  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment accountAggregationFields on AccountAggregation {
  id
  indexedAt
  
  totalRealisedPnl

  aggregatedTradeCloseds {
    ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds {
    ...aggregatedTradeLiquidatedFields
  }
  aggregatedTradeOpens {
    ...aggregatedTradeOpenFields
  }
}

`

export const accountAggregationQuery: TypedDocumentNode<{accountAggregation: IAccountAggregationMap}, IPageable & ITimerange & IAccountQueryParamApi> = gql`
${schemaFragments}

query ($account: ID, $from: Int = 0, $to: Int = 9e10,  $offset: Int = 0, $pageSize: Int = 1000) {
  accountAggregation(id: $account) {
    ...accountAggregationFields
  }
}

`

export const accountListAggregationQuery: TypedDocumentNode<{ accountAggregations: IAccountAggregationMap[] }, IPageable & ITimerange> = gql`
${schemaFragments}

query ($from: Int = 0, $to: Int = 9e10, $offset: Int = 0, $pageSize: Int = 1000, $orderBy: AccountAggregation_orderBy = totalRealisedPnl, $orderDirection: OrderDirection = desc) {
  accountAggregations(first: $pageSize, skip: $offset, orderBy: $orderBy, orderDirection: $orderDirection) {
    ...accountAggregationFields
  }
}
`

export const openAggregateTradesQuery: TypedDocumentNode<IAggregatedTradeOpenListMap> = gql`
${schemaFragments}

query($from: Int = 0, $to: Int = 9e10) {
  aggregatedTradeOpens(first: 1000) {
    ...aggregatedTradeOpenFields
  }
}
`

export const aggregatedSettledTradesMapQuery: TypedDocumentNode<IAggregatedTradeSettledListMap, IPageable & ITimerange> = gql`
${schemaFragments}

query ($pageSize: Int, $offset: Int = 0, $from: Int = 0, $to: Int = 9e10) {
  aggregatedTradeCloseds(first: 1000, skip: $offset, where: {indexedAt_gt: $from, indexedAt_lt: $to}) {
      ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds(first: 1000, where: {indexedAt_gt: $from, indexedAt_lt: $to}) {
    ...aggregatedTradeLiquidatedFields
  }
}
`
export const tradeListTimespanMapQuery: TypedDocumentNode<IAggregatedTradeSettledListMap, IPageable & ITimerange> = gql`
${schemaFragments}

query ($pageSize: Int, $offset: Int = 0, $from: Int = 0, $to: Int = 9e10) {
  aggregatedTradeCloseds(first: 1000, skip: $offset, where: {initialPositionBlockTimestamp_gt: $from, indexedAt_lt: $to}) {
      ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds(first: 1000, where: {initialPositionBlockTimestamp_gt: $from, indexedAt_lt: $to}) {
    ...aggregatedTradeLiquidatedFields
  }
}
`

export const openAggregateLiquidatedTradeQuery: TypedDocumentNode<{aggregatedTradeLiquidated: IAggregatedTradeLiquidated}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeLiquidated(id: $id) {
    ...aggregatedTradeLiquidatedFields
  }
}
`

export const openAggregateOpenTradeQuery: TypedDocumentNode<{aggregatedTradeOpen: IAggregatedTradeOpen}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeOpen(id: $id) {
    ...aggregatedTradeOpenFields
  }
}
`

export const aggregatedClosedTradeQuery: TypedDocumentNode<{aggregatedTradeClosed: IAggregatedTradeClosed}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeClosed(id: $id) {
      ...aggregatedTradeClosedFields
  }
}
`

export const chainlinkPricefeedQuery: TypedDocumentNode<{rounds: IChainlinkPrice[]}, IPageChainlinkPricefeed> = gql`

query ($feedAddress: String, $from: Int, $to: Int, $offset: Int = 0, $sortDirection: OrderDirection = asc, $sortBy: Round_orderBy = unixTimestamp) {
  rounds(first: 1000, skip: $offset, orderBy: $sortBy, orderDirection: $sortDirection, where: { feed: $feedAddress, unixTimestamp_gte: $from, unixTimestamp_lte: $to }) {
    unixTimestamp,
    value
  }
}

`


export interface IChainLinkMap {
  WBTC: IChainlinkPrice[],
  WETH : IChainlinkPrice[],
  LINK : IChainlinkPrice[],
  UNI : IChainlinkPrice[],
}

export const latestPricefeedMapQuery: TypedDocumentNode<IChainLinkMap, {}> = gql`

query ($sortDirection: OrderDirection = desc, $sortBy: Round_orderBy = unixTimestamp) {
  WBTC: rounds(first: 1000, orderBy: $sortBy, orderDirection: $sortDirection, where: { feed: "0xae74faa92cb67a95ebcab07358bc222e33a34da7" }) {
    unixTimestamp,
    value
  }
  
  WETH: rounds(first: 1000, orderBy: $sortBy, orderDirection: $sortDirection, where: { feed: "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6" }) {
    unixTimestamp,
    value
  }
  
  LINK: rounds(first: 1000, orderBy: $sortBy, orderDirection: $sortDirection, where: { feed: "0xdfd03bfc3465107ce570a0397b247f546a42d0fa" }) {
    unixTimestamp,
    value
  }
  
  UNI: rounds(first: 1000, orderBy: $sortBy, orderDirection: $sortDirection, where: { feed: "0x68577f915131087199fe48913d8b416b3984fd38" }) {
    unixTimestamp,
    value
  }
}

`

export const latestPricefeedMapQuery2: TypedDocumentNode<{rounds: IChainlinkPrice[]}, null> = gql`

query {
  WBTC: round(id: "0xae74faa92cb67a95ebcab07358bc222e33a34da7/10325") {
    unixTimestamp
    value
  }
  WETH: round(id: "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6/13283") {
    unixTimestamp,
    value
  }
  LINK: round(id: "0xdfd03bfc3465107ce570a0397b247f546a42d0fa/6665") {
    unixTimestamp,
    value
  }
  UNI: round(id: "0x68577f915131087199fe48913d8b416b3984fd38/6722") {
    unixTimestamp,
    value
  }
}

`
