import { Behavior } from "@aelea/core"
import { component } from "@aelea/dom"
import * as router from '@aelea/router'
import { Route } from '@aelea/router'
import { $column, layoutSheet, state } from '@aelea/ui-components'
import { BaseProvider } from '@ethersproject/providers'
import { Stream } from '@most/types'
import { IEthereumProvider } from "eip1193-provider"
import { AccountHistoricalDataApi, ETH_ADDRESS_REGEXP, IAccountAggregationMap, IAggregatedTradeSettledAll, IChainlinkPrice, IClaim, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, TradeType, TX_HASH_REGEX } from '@gambitdao/gmx-middleware'
import { IWalletLink } from "@gambitdao/wallet-link"
import { $Portfolio } from "./$Portfolio"
import { $Trade } from "./$Trade"



export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<Map<string, IClaim>>
  aggregatedTradeList: Stream<IAccountAggregationMap>
  settledPosition: Stream<IAggregatedTradeSettledAll>
  chainlinkPricefeed: Stream<IChainlinkPrice[]>
  walletLink: Stream<IWalletLink | null>

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
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {

  const accountRoute = config.parentRoute.create({ fragment: ETH_ADDRESS_REGEXP  })

  const tradeRoute = config.parentRoute
    .create({
      fragment: new RegExp(`^(${TradeType.OPEN}-\\d+-\\d+|${TradeType.CLOSED}-\\d+-\\d+|${TradeType.LIQUIDATED}-\\d+-\\d+)$`)
    })
    .create({
      fragment: TX_HASH_REGEX,
      title: 'Trade'
    })

  return [
    $column(layoutSheet.spacingBig)(
      router.match(accountRoute)(
        $Portfolio({
          claimMap: config.claimMap,
          parentStore: config.parentStore,
          parentRoute: accountRoute,
          accountAggregation: config.aggregatedTradeList,
          walletLink: config.walletLink
        })({
          requestAccountAggregation: requestAccountAggregationTether(),
          changeRoute: changeRouteTether(),
          walletChange: walletChangeTether()
        })
      ),
      router.match(tradeRoute)(
        $Trade({
          claimMap: config.claimMap,
          parentRoute: accountRoute,
          parentStore: config.parentStore,
          aggregatedTrade: config.settledPosition,
          chainlinkPricefeed: config.chainlinkPricefeed
        })({
          requestChainlinkPricefeed: requestChainlinkPricefeedTether(),
          requestAggregatedTrade: requestAggregatedTradeTether(),
          changeRoute: changeRouteTether(),
        })
      )
    ),

    { changeRoute, requestAccountAggregation, requestChainlinkPricefeed, requestAggregatedTrade, walletChange }
  ]
})

