import { gql, TypedDocumentNode } from "@urql/core"
import { IPagePositionParamApi, ITimerangeParamApi, IIdentifiableEntity, IPricefeed, ITrade, TradeStatus, IAccountQueryParamApi, IChainParamApi, IPriceTimelineParamApi, IPricefeedParamApi, IPriceLatest } from "@gambitdao/gmx-middleware"

export type IAccountTradeListParamApi = IChainParamApi & IAccountQueryParamApi & {status: TradeStatus};



const schemaFragments = `

fragment increasePositionFields on IncreasePosition {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  collateralDelta
  sizeDelta
  fee
  price
}

fragment decreasePositionFields on DecreasePosition {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  collateralDelta
  sizeDelta
  fee
  price
}

fragment updatePositionFields on UpdatePosition {
  id
  timestamp
  key
  size
  markPrice
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment closePositionFields on ClosePosition {
  id
  timestamp
  key
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment liquidatePositionFields on LiquidatePosition {
  id
  timestamp
  key
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

fragment tradeFields on Trade {
  id
  timestamp
  account
  collateralToken
  indexToken
  isLong
  key
  status

  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }

  sizeDelta
  collateralDelta
  fee
  size
  collateral
  averagePrice

  realisedPnl
  realisedPnlPercentage
  settledTimestamp
  closedPosition { ...closePositionFields }
  liquidatedPosition { ...liquidatePositionFields }
  
}
`


export const tradeListQuery: TypedDocumentNode<{trades: ITrade[]}, Partial<IPagePositionParamApi & ITimerangeParamApi & {status: TradeStatus}>> = gql`
${schemaFragments}

query ($pageSize: Int, $offset: Int = 0, $from: Int = 0, $to: Int = 1999999999 $status: Status = "closed") {
  trades(first: $pageSize, skip: $offset, where: {timestamp_gte: $from, timestamp_lte: $to, status: $status}) {
      ...tradeFields
  }
}
`

export const accountTradeListQuery: TypedDocumentNode<{trades: ITrade[]}, Partial<IAccountTradeListParamApi>> = gql`
${schemaFragments}

query ($pageSize: Int = 1000, $account: String) {
  trades(first: $pageSize, skip: $offset, where: {account: $account}) {
      ...tradeFields
  }
}
`

export const tradeQuery: TypedDocumentNode<{trade: ITrade}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  trade(id: $id) {
      ...tradeFields
  }
}
`


export const pricefeed: TypedDocumentNode<{ pricefeeds: IPricefeed[] }, Omit<IPricefeedParamApi, 'chain'>> = gql`
${schemaFragments}

query($from: Int, $to: Int = 1999999999, $tokenAddress: TokenAddress, $interval: IntervalTime) {
  pricefeeds(first: 1000, orderBy: timestamp, orderDirection: asc, where: {tokenAddress: $tokenAddress, interval: $interval, timestamp_gte: $from, timestamp_lte: $to }) {
    id
    timestamp
    o
    h
    l
    c
    tokenAddress
    interval
  }
}
`




export const priceTimelineQuery: TypedDocumentNode<{priceTimelines: IPricefeed[]}, IPriceTimelineParamApi> = gql`
query ($from: Int, $to: Int, $tokenAddress: TokenAddress ) {
  priceTimelines(first: 1000, orderBy: unixTimestamp, orderDirection: asc, where: { tokenAddress: $tokenAddress, timestamp_gte: $from, timestamp_lte: $to }) {
    timestamp,
    value
  }
}
`



export const latestPriceTimelineQuery: TypedDocumentNode<{priceLatests: IPriceLatest[]}, {}> = gql`
query {
  priceLatests {
    id
    value
    timestamp
  }
}
`


// export const latestPriceTimelineArbitrumQuery: TypedDocumentNode<IPriceTimelineArbitrumMap, {}> = gql`
// ${schemaFragments}

// query {
//   ETH: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0x82af49447d8a07e3bd95bd0d56f35241523fbab1 }) {
//     ...pricefeedFields
//   }
//   LINK: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0xf97f4df75117a78c1a5a0dbb814af92458539fb4 }) {
//     ...pricefeedFields
//   }
//   BTC: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f }) {
//     ...pricefeedFields
//   }
//   UNI: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0 }) {
//     ...pricefeedFields
//   }
// }
// `


// export const latestPriceTimelineAvalancheQuery: TypedDocumentNode<IPriceTimelineArbitrumMap, {}> = gql`
// ${schemaFragments}

// query {
//   AVAX: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7 }) {
//     ...pricefeedFields
//   }
//   ETH: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab }) {
//     ...pricefeedFields
//   }
//   BTC: pricefeeds(first: 1, orderBy: timestamp, orderDirection: desc, where: { tokenAddress: _0x50b7545627a5162f82a992c33b87adc75187b218 }) {
//     ...pricefeedFields
//   }
// }
// `


