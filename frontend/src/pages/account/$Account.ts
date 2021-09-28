import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, state } from '@aelea/ui-components'

import {  AccountHistoricalDataApi, ETH_ADDRESS_REGEXP, IAccountAggregationMap, IAggregatedTradeSettledAll, IIdentifiableEntity, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, TX_HASH_REGEX  } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import * as router from '@aelea/router'
import { Behavior } from "@aelea/core"
import { $Portfolio } from "./$Portfolio"
import { $Trade } from "./$Trade"
import { toAggregatedTradeClosedJson } from "../../logic/utils"
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
  [requestAggregatedSettleTrade, requestAggregatedSettleTradeTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
) => {

  const accountRoute = config.parentRoute.create({
    fragment: ETH_ADDRESS_REGEXP,
    title: 'Account'
  })

  const tradeRoute = config.parentRoute.create({
    fragment: TX_HASH_REGEX,
    title: 'Account'
  })

  return [
    $column(layoutSheet.spacingBig)(
      router.match(accountRoute)(
        $Portfolio({
          parentStore: config.parentStore,
          accountAggregation: config.aggregatedTradeList
        })({
          requestAccountAggregation: requestAccountAggregationTether()
        })
      ),
      router.contains(tradeRoute)(
        $Trade({
          parentStore: config.parentStore,
          settledPosition: map(toAggregatedTradeClosedJson, config.settledPosition),
          chainlinkPricefeed: config.chainlinkPricefeed
        })({
          requestChainlinkPricefeed: requestChainlinkPricefeedTether(),
          requestAggregatedSettleTrade: requestAggregatedSettleTradeTether(),
        })
      )
    ),

    { requestAccountAggregation, requestChainlinkPricefeed, requestAggregatedSettleTrade }
  ]
})

