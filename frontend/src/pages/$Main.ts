import { Behavior } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { empty, fromPromise, map, merge, mergeArray, multicast, now } from '@most/core'
import { IEthereumProvider } from "eip1193-provider"
import { AccountHistoricalDataApi, fromJson, groupByMap, IAggregatedAccountSummary, IAggregatedOpenPositionSummary, IIdentifiableEntity, ILeaderboardRequest, IPagableResponse, IPageable, IPageChainlinkPricefeed, TradeType, TX_HASH_REGEX } from 'gambit-middleware'
import { initWalletLink } from "wallet-link"
import { $logo } from '../common/$icons'
import * as wallet from "../common/wallets"
import { $MainMenu } from '../components/$MainMenu'
import { $anchor } from '../elements/$common'
import { $cubes } from '../elements/$cube'
import { $github } from '../elements/$icons'
import { claimListQuery } from "../logic/claim"
// import { $Tournament } from './tournament/$tournament'
import { helloBackend } from '../logic/leaderboard'
import { $Card } from "./$Card"
import { $Leaderboard } from './$Leaderboard'
import { $Account } from './account/$Account'





const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)


interface Website {
  baseRoute?: string
}

export default ({ baseRoute = '' }: Website) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  // [requestAccountListAggregation, requestAccountListAggregationTether]: Behavior<LeaderboardApi, LeaderboardApi>,
  [requestLeaderboardTopList, requestLeaderboardTopListTether]: Behavior<ILeaderboardRequest, ILeaderboardRequest>,
  [requestOpenAggregatedTrades, requestOpenAggregatedTradesTether]: Behavior<IPageable, IPageable[]>,
  [requestAccountAggregation, requestAccountAggregationTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,
  [requestAggregatedTrade, requestAggregatedTradeTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
  // [accountAggregationQuery, accountAggregationQueryTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)


  const rootRoute = router.create({ fragment: baseRoute, title: 'Gambit  Community', fragmentsChange })
  const pagesRoute = rootRoute.create({ fragment: 'p', title: 'aelea' })
  const leaderboardRoute = pagesRoute.create({ fragment: 'leaderboard', title: 'Leaderboard' })
  const accountRoute = pagesRoute.create({ fragment: 'account', title: 'Portfolio' })

  const cardRoute = rootRoute
    .create({ fragment: 'card' })
    .create({
      fragment: new RegExp(`^(${TradeType.OPEN}|${TradeType.CLOSED}|${TradeType.LIQUIDATED})$`)
    })
    .create({ fragment: TX_HASH_REGEX, title: 'Trade Details' })



  const rootStore = state.createLocalStorageChain('store-2')

  const claimMap = state.replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )

  const clientApi = helloBackend({
    requestAccountAggregation,
    requestLeaderboardTopList,
    requestOpenAggregatedTrades,
    requestChainlinkPricefeed,
    requestAggregatedTrade,
    // requestAccountListAggregation,
  })

  const walletLink = initWalletLink({
    walletProviders: [wallet.metamask, wallet.walletConnect]
  }, walletChange)

  return [

    mergeArray([
      $node(designSheet.main, style({ backgroundImage: `radial-gradient(570% 71% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh', overflow: 'hidden', position: 'relative', maxWidth: '1100px', padding: '0 30px', margin: '0 auto', width: '100%', alignItems: 'center', placeContent: 'center' }), layoutSheet.spacingBig)(

            $row(style({ alignItems: 'center', width: '100%' }))(
              $column(layoutSheet.spacingSmall, style({ fontWeight: 200, fontSize: '1.1em', textAlign: 'center', color: pallete.foreground }))(
                $text(style({  }))(`Novel Perpetual Protocol`),
                $text(style({ fontSize: '2em', fontWeight: 700, paddingBottom: '6px', color: pallete.message }))(`GMX Community`),
                $text(style({  }))(`Low slippage, low fees and Instant Finality`),

                $node(),
                $node(),
                $node(),
                $node(),
              ),

              $row(style({ flex: 1 }))()
            ),

            $node(),
            $node(),
            $node(),

            $row(style({ width: '100%', padding: '26px', alignItems: 'center', zIndex: 1000, borderRadius: '12px', backdropFilter: 'blur(8px)', backgroundColor: colorAlpha(pallete.background, 0.50) }))(
              $row(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
                $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '45px', viewBox: '0 0 32 32' })) })({
                  click: linkClickTether()
                }),
                $anchor(layoutSheet.displayFlex, style({ padding: '0 4px' }), attr({ href: 'https://github.com/nissoh/gambit-community' }))(
                  $icon({ $content: $github, width: '25px', viewBox: `0 0 1024 1024` })
                ),
                $node(),
                $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute })({
                  routeChange: linkClickTether(),
                  walletChange: walletChangeTether()
                })
              ),
            ),
            $cubes(),

          )
        ),

        router.contains(pagesRoute)(
          $column(layoutSheet.spacingBig, style({ maxWidth: '1080px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
            $row(layoutSheet.spacing, style({ padding: screenUtils.isDesktopScreen ? '34px 15px' : '18px 12px 0', zIndex: 30, alignItems: 'center' }))(
              screenUtils.isDesktopScreen
                ? $RouterAnchor({ $anchor: $element('a')($icon({ $content: $logo, fill: pallete.message, width: '46px', height: '46px', viewBox: '0 0 32 32' })), url: '/', route: rootRoute })({
                  click: linkClickTether()
                })
                : empty(),
              screenUtils.isDesktopScreen ? $node(layoutSheet.flex)() : empty(),
              $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, containerOp: style({ padding: '34px, 20px' }) })({
                routeChange: linkClickTether(),
                walletChange: walletChangeTether()
              })
            ),
            router.match(leaderboardRoute)(
              $Leaderboard({
                claimMap,
                parentRoute: rootRoute,
                parentStore: rootStore,
                openAggregatedTrades: map((x: IPagableResponse<IAggregatedOpenPositionSummary>) => ({ ...x, page: x.page.map(fromJson.toAggregatedPositionSummary) }), clientApi.requestOpenAggregatedTrades),
                requestLeaderboardTopList: map((data: IPagableResponse<IAggregatedAccountSummary>) => ({
                  page: data.page.map(fromJson.accountSummaryJson),
                  offset: data.offset,
                  pageSize: data.pageSize
                }), clientApi.requestLeaderboardTopList),
              })({
                requestLeaderboardTopList: requestLeaderboardTopListTether(),
                requestOpenAggregatedTrades: requestOpenAggregatedTradesTether(),
                routeChange: linkClickTether()
              })
            ),
            // router.match(tournamentRoute)(
            //   $Tournament({ parentRoute: rootRoute, parentStore: rootStore, claimList, tournamentQuery: map(x => x.map(leaderboardAccountJson), clientApi.tournament) })({
            //     tournamentQuery: tournamentQueryTether()
            //   })
            // ),
            router.contains(accountRoute)(
              $Account({
                claimMap,
                parentRoute: accountRoute,
                parentStore: rootStore,
                aggregatedTradeList: map(res => res ? fromJson.toAccountAggregationJson(res): null, clientApi.requestAccountAggregation),
                settledPosition: clientApi.requestAggregatedTrade,
                chainlinkPricefeed: clientApi.requestChainlinkPricefeed,
                walletLink
              })({
                requestAggregatedTrade: requestAggregatedTradeTether(),
                requestChainlinkPricefeed: requestChainlinkPricefeedTether(),
                requestAccountAggregation: requestAccountAggregationTether(),
                changeRoute: linkClickTether(),
                walletChange: walletChangeTether()
              })
            ),
          )
        ),
      ),
      
      router.contains(cardRoute)(
        $node(designSheet.main, style({ overflow: 'hidden', fontWeight: 300, backgroundImage: `radial-gradient(100vw 50% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(  
          $Card({
            claimMap,
            aggregatedTrade: clientApi.requestAggregatedTrade,
            chainlinkPricefeed: clientApi.requestChainlinkPricefeed
          })({
            requestAggregatedTrade: requestAggregatedTradeTether(),
            // requestChainlinkPricefeed: requestChainlinkPricefeedTether()
          })
        )
      )

    ])
  ]
})



