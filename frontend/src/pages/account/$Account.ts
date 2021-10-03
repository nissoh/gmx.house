import { component } from "@aelea/dom"
import { $column, layoutSheet, state } from '@aelea/ui-components'

import {  AccountHistoricalDataApi, ETH_ADDRESS_REGEXP, IAccountAggregationMap, IAggregatedTradeSettledAll, IIdentifiableEntity, IChainlinkPrice, IPageChainlinkPricefeed, TX_HASH_REGEX, fromJson, TradeType, IRequestAggregatedTradeQueryparam, TradeDirection  } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import * as router from '@aelea/router'
import { Behavior } from "@aelea/core"
import { $Portfolio } from "./$Portfolio"
import { $Trade } from "./$Trade"

import { map } from "@most/core"



export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  aggregatedTradeList: Stream<IAccountAggregationMap>
  settledPosition: Stream<IAggregatedTradeSettledAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;

}


export const $Account = <T extends BaseProvider>(config: IPortfolio<T>) => component((
  [requestAccountAggregation, requestAccountAggregationTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,
  // [requestAggregatedClosedTrade, requestAggregatedClosedTradeTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
  // [requestAggregatedOpenTrade, requestAggregatedClosedOpenTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
  // [requestAggregatedLiquidatedTrade, requestAggregatedLiquidatedOpenTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
  [requestAggregatedTrade, requestAggregatedTradeTether]: Behavior<IRequestAggregatedTradeQueryparam, IRequestAggregatedTradeQueryparam>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
) => {

  const accountRoute = config.parentRoute.create({ fragment: ETH_ADDRESS_REGEXP  })

  const tradeRoute = accountRoute
    .create({
      fragment: new RegExp(`^(${TradeType.OPEN}|${TradeType.CLOSED}|${TradeType.LIQUIDATED})$`)
    })
    .create({
      fragment: TX_HASH_REGEX,
      title: 'Trade'
    })

  return [
    $column(layoutSheet.spacingBig)(
      router.match(accountRoute)(
        $Portfolio({
          parentStore: config.parentStore,
          parentRoute: accountRoute,
          accountAggregation: config.aggregatedTradeList
        })({
          requestAccountAggregation: requestAccountAggregationTether(),
          changeRoute: changeRouteTether()
        })
      ),
      router.match(tradeRoute)(
        $Trade({
          parentStore: config.parentStore,
          aggregatedTrade: config.settledPosition,
          chainlinkPricefeed: config.chainlinkPricefeed
        })({
          requestChainlinkPricefeed: requestChainlinkPricefeedTether(),
          requestAggregatedTrade: requestAggregatedTradeTether(),
        })
      )
    ),

    { changeRoute, requestAccountAggregation, requestChainlinkPricefeed, requestAggregatedTrade, }
  ]
})

