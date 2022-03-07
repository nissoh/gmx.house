import { Behavior } from "@aelea/core"
import { component } from "@aelea/dom"
import * as router from '@aelea/router'
import { Route } from '@aelea/router'
import { $column, layoutSheet, state } from '@aelea/ui-components'
import { BaseProvider } from '@ethersproject/providers'
import { Stream } from '@most/types'
import { IEthereumProvider } from "eip1193-provider"
import { ETH_ADDRESS_REGEXP, ITrade, IPricefeed, IClaim, IPricefeedParamApi, IRequestTradeQueryparam, IAccountTradeListParamApi, IPriceLatestMap } from '@gambitdao/gmx-middleware'
import { IWalletLink } from "@gambitdao/wallet-link"
import { $Portfolio } from "./$Portfolio"



export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimMap: Stream<{ [k: string]: IClaim }>
  tradeList: Stream<ITrade[]>
  settledPosition: Stream<ITrade>
  pricefeed: Stream<IPricefeed[]>
  latestPriceMap: Stream<IPriceLatestMap>

  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;
}


export const $Account = <T extends BaseProvider>(config: IPortfolio<T>) => component((
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [requestPricefeed, requestPricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
  [requestLatestPriceMap, requestLatestPriceMapTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
  [requestTrade, requestTradeTether]: Behavior<IRequestTradeQueryparam, IRequestTradeQueryparam>,
  
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {

  const accountRoute = config.parentRoute.create({ fragment: ETH_ADDRESS_REGEXP  })

  return [
    $column(layoutSheet.spacingBig)(
      router.match(accountRoute)(
        $Portfolio({
          pricefeed: config.pricefeed,
          claimMap: config.claimMap,
          parentStore: config.parentStore,
          parentRoute: accountRoute,
          accountTradeList: config.tradeList,
          latestPriceMap: config.latestPriceMap,
          walletLink: config.walletLink,
          walletStore: config.walletStore
        })({
          pricefeed: requestPricefeedTether(),
          requestAccountTradeList: requestAccountTradeListTether(),
          changeRoute: changeRouteTether(),
          requestLatestPriceMap: requestLatestPriceMapTether(),
          walletChange: walletChangeTether()
        })
      ),
    ),

    { changeRoute, requestAccountTradeList, requestPricefeed, requestLatestPriceMap, requestTrade, walletChange }
  ]
})

