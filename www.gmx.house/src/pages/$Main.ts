import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, attr, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { awaitPromises, empty, map, merge, mergeArray, multicast, now } from '@most/core'
import { IEthereumProvider } from "eip1193-provider"
import {
  ARBITRUM_TRADEABLE_ADDRESS, AVALANCHE_TRADEABLE_ADDRESS,
  CHAIN, fromJson, groupByMap, IAccountSummary, IAccountTradeListParamApi, IChainParamApi,
  IIdentifiableEntity, ILeaderboardRequest, intervalInMsMap, IPageParapApi,
  IPagePositionParamApi, IPricefeed, IPricefeedParamApi, IPriceLatestMap, ITradeOpen, TradeStatus, TX_HASH_REGEX
} from '@gambitdao/gmx-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import { $logo } from '../common/$icons'
import * as wallet from "../common/wallets"
import { $MainMenu } from '../components/$MainMenu'
import { $anchor } from '../elements/$common'
import { $cubes } from '../elements/$cube'
import { $github } from '../elements/$icons'
import { claimListQuery } from "../logic/claim"
import { helloBackend } from '../logic/leaderboard'
import { $Card } from "./$Card"
import { $Leaderboard } from './$Leaderboard'
import { $Account } from './account/$Account'
// import { $CompetitionCumulative } from "./competition/$cumulative"
// import { $CompetitionSingle } from "./competition/$single"
import { $CompeititonInfo } from "./competition/$rules"
import { Stream } from "@most/types"
import { $Trade } from "./account/$Trade"
import { IAccountLadderSummary, IQueryCompetitionApi } from "common"
import { $CompetitionRoi } from "./competition/$CumulativeRoi"
import { $CumulativePnl } from "./competition/$CumulativePnl"





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

  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<IAccountTradeListParamApi, IAccountTradeListParamApi>,
  [requestLeaderboardTopList, requestLeaderboardTopListTether]: Behavior<ILeaderboardRequest, ILeaderboardRequest>,
  [requestOpenTrades, requestOpenTradesTether]: Behavior<IPagePositionParamApi, IPagePositionParamApi[]>,
  [requestPricefeed, requestPricefeedTether]: Behavior<IPricefeedParamApi, IPricefeedParamApi>,
  [requestLatestPriceMap, requestLatestPriceMapTether]: Behavior<IChainParamApi, IChainParamApi>,
  [competitionCumulativePnl, competitionCumulativePnlTether]: Behavior<IQueryCompetitionApi, IQueryCompetitionApi>,
  [competitionCumulativeRoi, competitionCumulativeRoiTether]: Behavior<IQueryCompetitionApi, IQueryCompetitionApi>,
  [requestTrade, requestTradeTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)


  const rootRoute = router.create({ fragment: baseRoute, title: 'Community Leaderboard - GMX.house', fragmentsChange })
  const chainRoute = rootRoute.create({ fragment: /avalanche|arbitrum/, title: '' })
  const leaderboardRoute = chainRoute.create({ fragment: 'leaderboard', title: 'Leaderboard' })
  const accountRoute = chainRoute.create({ fragment: 'account', title: 'Portfolio' })

  // competition
  const competitionCumulativeRoiRoute = chainRoute.create({ fragment: 'top-roi', title: 'Top ROI - Avalanche Trading Competition' })
  const competitionCumulativePnlRoute = chainRoute.create({ fragment: 'top-profit', title: 'Top PnL - Avalanche Trading Competition' })

  const tradeRoute = chainRoute
    .create({ fragment: /.*/ })
    .create({ fragment: /^Trade:0x([A-Fa-f0-9]{64})$/i })
    .create({
      title: 'Trade',
      fragment: /^\d+$/
    })

  const cardRoute = rootRoute
    .create({ fragment: 'card' })
    .create({
      fragment: new RegExp(`^(${TradeStatus.OPEN}|${TradeStatus.CLOSED}|${TradeStatus.LIQUIDATED})$`)
    })
    .create({ fragment: TX_HASH_REGEX, title: 'Trade Details' })


  const rootStore = state.createLocalStorageChain('store-3')

  const claimMap = replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )

  const clientApi = helloBackend({
    requestLeaderboardTopList,
    requestOpenTrades,
    requestTrade,
    requestAccountTradeList,
    competitionCumulativePnl,
    competitionCumulativeRoi,
    requestPricefeed,
    requestLatestPriceMap,
  })

  const walletStore = rootStore<'metamask' | 'walletConnect' | null, 'walletStore'>('walletStore', null)

  const chosenWalletName = now(walletStore.state)
  const defaultWalletProvider: Stream<IEthereumProvider | null> = awaitPromises(map(async name => {
    const provider = name === 'walletConnect' ? wallet.walletConnect : await wallet.metamaskQuery
    if (name && provider) {
      const [mainAccount]: string[] = await provider.request({ method: 'eth_accounts' }) as any
      if (mainAccount) {
        return provider
      }

    }

    return null
  }, chosenWalletName))


  const walletLink = initWalletLink(
    merge(defaultWalletProvider, walletChange)
  )



  const latestPriceMap = replayLatest(multicast(map((res: IPriceLatestMap) => Object.entries(res).reduce((seed, [key, price]) => {
    const k = key as ARBITRUM_TRADEABLE_ADDRESS | AVALANCHE_TRADEABLE_ADDRESS
    seed[k] = fromJson.priceLatestJson(price)
    return seed
  }, {} as IPriceLatestMap), clientApi.requestLatestPriceMap)))

  const date = new Date()

  const COMPETITION_START = Date.UTC(date.getFullYear(), date.getMonth(), 1, 16) / 1000
  const COMPETITION_END = COMPETITION_START + intervalInMsMap.HR24 * 23

  return [
    mergeArray([
      $node(designSheet.main, style({ fontSize: '1.1rem', backgroundImage: `radial-gradient(570% 71% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh', overflow: 'hidden', maxWidth: '1100px', padding: '0 30px', margin: '0 auto', width: '100%', alignItems: 'center', placeContent: 'center' }), layoutSheet.spacingBig)(

            $row(style({ alignItems: 'center', placeSelf: 'center' }))(
              $column(layoutSheet.spacingSmall, style({ fontWeight: 200, fontSize: '1.1em', textAlign: 'center' }))(


                $CompeititonInfo(COMPETITION_START, COMPETITION_END, rootRoute, linkClickTether),

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

            $row(style({ width: '100%', padding: '26px', alignItems: 'center', zIndex: 1000, borderRadius: '12px', backgroundColor: colorAlpha(pallete.background, .9) }))(
              $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '45px', viewBox: '0 0 32 32' })) })({
                  click: linkClickTether()
                }),
                $node(),
                $MainMenu({ walletLink, claimMap, parentRoute: chainRoute, showAccount: false, walletStore })({
                  routeChange: linkClickTether(),
                  walletChange: walletChangeTether()
                })
              ),
            ),
            $cubes(),

          )
        ),

        router.contains(chainRoute)(
          $column(layoutSheet.spacingBig, style({ maxWidth: '1080px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
            $row(layoutSheet.spacing, style({ padding: screenUtils.isDesktopScreen ? '34px 15px' : '18px 12px 0', zIndex: 30, alignItems: 'center' }))(

              $row(layoutSheet.flex)(
                $RouterAnchor({ $anchor: $element('a')($icon({ $content: $logo, fill: pallete.message, width: '46px', height: '46px', viewBox: '0 0 32 32' })), url: '/', route: rootRoute })({
                  click: linkClickTether()
                }),
              ),
              
              $MainMenu({ walletLink, walletStore, claimMap, parentRoute: chainRoute, containerOp: style({ padding: '34px, 20px' }) })({
                routeChange: linkClickTether(),
                walletChange: walletChangeTether()
              }),

              screenUtils.isDesktopScreen ? empty() : $node(layoutSheet.flex)(),
            ),
            router.match(leaderboardRoute)(
              $column(layoutSheet.spacingBig)(
                $CompeititonInfo(COMPETITION_START, COMPETITION_END, rootRoute, linkClickTether),
                $node(),
                $Leaderboard({
                  claimMap,
                  parentRoute: rootRoute,
                  walletLink,
                  latestPriceMap,
                  parentStore: rootStore,
                  openTrades: map((x: IPageParapApi<ITradeOpen>) => ({ ...x, page: x.page.map(fromJson.toTradeJson) }), clientApi.requestOpenTrades),
                  requestLeaderboardTopList: map((data: IPageParapApi<IAccountSummary>) => ({
                    page: data.page.map(fromJson.accountSummaryJson),
                    offset: data.offset,
                    pageSize: data.pageSize
                  }), clientApi.requestLeaderboardTopList),
                })({
                  requestLeaderboardTopList: requestLeaderboardTopListTether(),
                  requestOpenTrades: requestOpenTradesTether(),
                  requestLatestPriceMap: requestLatestPriceMapTether(),
                  routeChange: linkClickTether()
                })
              )
            ),

            // router.match(competitionCumulativePnlRoute)(
            //   $column(
            //     style({ gap: '46px', display: 'flex' }),
            //     screenUtils.isDesktopScreen
            //       ? style({ width: '780px', alignSelf: 'center' })
            //       : style({ width: '100%' })
            //   )(
            //     $CompeititonInfo(COMPETITION_START, COMPETITION_END, chainRoute, linkClickTether),
            //     $CumulativePnl({
            //       from: COMPETITION_START,
            //       to: COMPETITION_END,
            //       chain: CHAIN.AVALANCHE,
            //       walletStore,
            //       walletLink,
            //       claimMap,
            //       parentRoute: chainRoute,
            //       parentStore: rootStore,
            //       competitionCumulativePnl: map((x: IPageParapApi<IAccountLadderSummary>) => ({
            //         ...x, page: x.page.map(obj => ({ ...fromJson.accountSummaryJson(obj), pnl: BigInt(obj.pnl) }))
            //       }), clientApi.competitionCumulativePnl),
            //     })({
            //       competitionCumulativePnl: competitionCumulativePnlTether(map(page => {
            //         return { ...page, from: COMPETITION_START, to: COMPETITION_END }
            //       })),
            //       routeChange: linkClickTether()
            //     })
            //   )
            // ),
            // router.match(competitionCumulativeRoiRoute)(
            //   $column(
            //     style({ gap: '46px', display: 'flex' }),
            //     screenUtils.isDesktopScreen
            //       ? style({ width: '780px', alignSelf: 'center' })
            //       : style({ width: '100%' })
            //   )(
            //     $CompeititonInfo(COMPETITION_START, COMPETITION_END, chainRoute, linkClickTether),
            //     $CompetitionRoi({
            //       from: COMPETITION_START,
            //       to: COMPETITION_END,
            //       chain: CHAIN.AVALANCHE,
            //       walletStore,
            //       claimMap,
            //       walletLink,
            //       parentRoute: chainRoute,
            //       parentStore: rootStore,
            //       competitionCumulativeRoi: map((x: IPageParapApi<IAccountLadderSummary>) => {
            //         return { ...x, page: x.page.map(obj => ({ ...fromJson.accountSummaryJson(obj), pnl: BigInt(obj.pnl), roi: BigInt(obj.roi) })) }
            //       }, clientApi.competitionCumulativeRoi),
            //     })({
            //       competitionCumulativeRoi: competitionCumulativeRoiTether(),
            //       routeChange: linkClickTether()
            //     })
            //   )
            // ),


            router.contains(accountRoute)(
              $Account({
                claimMap,
                parentRoute: accountRoute,
                parentStore: rootStore,
                latestPriceMap,
                tradeList: map((res: ITradeOpen[]) => res.map(fromJson.toTradeJson), clientApi.requestAccountTradeList),
                settledPosition: clientApi.requestTrade,
                pricefeed: map((feed: IPricefeed[]) => feed.map(fromJson.pricefeedJson), clientApi.requestPricefeed),
                walletLink,
                walletStore,
              })({
                requestTrade: requestTradeTether(),
                requestPricefeed: requestPricefeedTether(),
                requestAccountTradeList: requestAccountTradeListTether(),
                requestLatestPriceMap: requestLatestPriceMapTether(),
                changeRoute: linkClickTether(),
                walletChange: walletChangeTether()
              })
            ),

            router.contains(tradeRoute)(
              $Trade({
                claimMap,
                parentRoute: tradeRoute,
                parentStore: rootStore,
                trade: map(trade => trade ? fromJson.toTradeJson(trade) : null, clientApi.requestTrade),
                latestPriceMap: latestPriceMap,
                pricefeedRange: map((feed: IPricefeed[]) => feed.map(fromJson.pricefeedJson), clientApi.requestPricefeed)
              })({
                requestPricefeed: requestPricefeedTether(),
                requestTrade: requestTradeTether(),
                requestLatestPriceMap: requestLatestPriceMapTether(),
                changeRoute: linkClickTether(),
              })
            ),
          )
        ),
      ),

      router.contains(cardRoute)(
        $node(designSheet.main, style({ overflow: 'hidden', fontWeight: 300, backgroundImage: `radial-gradient(100vw 50% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(
          $Card({
            claimMap,
            trade: clientApi.requestTrade,
            latestPriceMap,
            chainlinkPricefeed: clientApi.requestChainlinkPricefeed
          })({
            requestTrade: requestTradeTether(),
          })
        )
      )

    ])
  ]


})


