import { $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, state } from '@aelea/ui-components'

import {  AccountHistoricalDataApi, ETH_ADDRESS_REGEXP, HistoricalDataApi, IAggregateSettledTrade, IAggregateTrade, IClaim  } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import * as router from '@aelea/router'
import { $Profile } from './$Profile'
import { Behavior } from "@aelea/core"



export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<IClaim[]>
  aggregatedTradeList: Stream<IAggregateSettledTrade[]>
  aggregatedOpenTradeList: Stream<IAggregateTrade[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;

}


export const $Portfolio = <T extends BaseProvider>(config: IPortfolio<T>) => component((
  [aggregatedTradeListQuery, aggregatedTradeListQueryTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
) => {

  const $header = $text(style({ fontSize: '1.45em', fontWeight: 'lighter', letterSpacing: '4px' }))


  const accountRoute = config.parentRoute.create({
    fragment: ETH_ADDRESS_REGEXP,
    title: 'Account'
  })


  return [
    $column(layoutSheet.spacingBig)(
      router.match(accountRoute)(
        $Profile({
          parentStore: config.parentStore,
          claimList: config.claimList,
          aggregatedTradeList: config.aggregatedTradeList
        })({
          aggregatedTradeListQuery: aggregatedTradeListQueryTether()
        })
      ),
    ),

    { aggregatedTradeListQuery }
  ]
})

