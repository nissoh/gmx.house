import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete, theme } from '@aelea/ui-components-theme'
import { awaitPromises, empty, map, merge, mergeArray, multicast, now } from '@most/core'
import { IEthereumProvider } from "eip1193-provider"
import {
  ARBITRUM_TRADEABLE_ADDRESS,
  AVALANCHE_TRADEABLE_ADDRESS,
  fromJson, groupByMap, IAccountSummary,
  IAccountTradeListParamApi,
  IChainParamApi,
  IIdentifiableEntity, ILeaderboardRequest, IPageParapApi,
  IPagePositionParamApi, IPricefeed, IPricefeedParamApi, IPriceLatestMap, ITimerangeParamApi, ITradeOpen, TradeStatus, TX_HASH_REGEX
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
import { $CompeititonInfo, BATCH_1_END, BATCH_2_START, COMPETITION_END, COMPETITION_START } from "./competition/$rules"
import { Stream } from "@most/types"
import { $Trade } from "./account/$Trade"
import { IAccountLadderSummary } from "common"
import { $CompetitionRoi } from "./competition/$CumulativeRoi"
import { $CompetitionPnl } from "./competition/$CumulativePnl"





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
  [competitionCumulativePnl, competitionCumulativePnlTether]: Behavior<IPagePositionParamApi, IPagePositionParamApi & ITimerangeParamApi>,
  [competitionCumulativeRoi, competitionCumulativeRoiTether]: Behavior<IPagePositionParamApi, IPagePositionParamApi & ITimerangeParamApi>,
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


  const rootRoute = router.create({ fragment: baseRoute, title: 'Gambit  Community', fragmentsChange })
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



  function competitionHeadline(title: string, description: string, prizePool: string) {
    return $column(style({ padding: '0 10px' }))(
      $CompeititonInfo(rootRoute, linkClickTether),

      $row(style({}))(

        $column(layoutSheet.spacingSmall, style({ marginBottom: '26px', flex: 1 }))(
          $text(title),
          $text(style({ fontSize: '.65em' }))(description)
        ),

        $row(
          $text(style({
            color: pallete.positive,
            fontSize: '1.75em',
            textShadow: `${pallete.positive} 1px 1px 20px, ${pallete.positive} 0px 0px 20px`
          }))(prizePool)
        )
      )
      
    )
  }
  
  const latestPriceMap = replayLatest(multicast(map((res: IPriceLatestMap) => Object.entries(res).reduce((seed, [key, price]) => {
    const k = key as ARBITRUM_TRADEABLE_ADDRESS | AVALANCHE_TRADEABLE_ADDRESS
    seed[k] = fromJson.priceLatestJson(price)
    return seed
  }, {} as IPriceLatestMap), clientApi.requestLatestPriceMap)))

  return [
    mergeArray([
      $node(designSheet.main, style({ fontSize: '1.1rem', backgroundImage: `radial-gradient(570% 71% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh', overflow: 'hidden', maxWidth: '1100px', padding: '0 30px', margin: '0 auto', width: '100%', alignItems: 'center', placeContent: 'center' }), layoutSheet.spacingBig)(

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

            $row(style({ width: '100%', padding: '26px', alignItems: 'center', zIndex: 1000, borderRadius: '12px', backgroundColor: colorAlpha(pallete.background, .9) }))(
              $row(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
                $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '45px', viewBox: '0 0 32 32' })) })({
                  click: linkClickTether()
                }),
                $anchor(layoutSheet.displayFlex, style({ padding: '0 4px' }), attr({ href: 'https://github.com/nissoh/gambit-community' }))(
                  $icon({ $content: $github, width: '25px', viewBox: `0 0 1024 1024` })
                ),
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
              screenUtils.isDesktopScreen
                ? $RouterAnchor({ $anchor: $element('a')($icon({ $content: $logo, fill: pallete.message, width: '46px', height: '46px', viewBox: '0 0 32 32' })), url: '/', route: rootRoute })({
                  click: linkClickTether()
                })
                : empty(),
              screenUtils.isDesktopScreen ? $node(layoutSheet.flex)() : empty(),
              $MainMenu({ walletLink, walletStore, claimMap, parentRoute: chainRoute, containerOp: style({ padding: '34px, 20px' }) })({
                routeChange: linkClickTether(),
                walletChange: walletChangeTether()
              })
            ),
            router.match(leaderboardRoute)(
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
            ),

            router.match(competitionCumulativePnlRoute)(
              $column(
                // competitionHeadline(`Cumulative PnL`, `During(TEST) ${displayDate(COMPETITION_START)} - ${displayDate(COMPETITION_END)}`, '$125,000'),
                $CompetitionPnl({
                  claimMap,
                  parentRoute: rootRoute,
                  parentStore: rootStore,
                  competitionCumulativePnl: map((x: IPageParapApi<IAccountLadderSummary>) => ({
                    ...x, page: x.page.map(obj => ({ ...fromJson.accountSummaryJson(obj), pnl: BigInt(obj.pnl) }))
                  }), clientApi.competitionCumulativePnl),
                })({
                  competitionCumulativePnl: competitionCumulativePnlTether(map(page => {
                    return { ...page, from: COMPETITION_START, to: COMPETITION_END }
                  })),
                  routeChange: linkClickTether()
                })
              )
            ),
            router.match(competitionCumulativeRoiRoute)(
              $column(
                $CompeititonInfo(rootRoute, linkClickTether),
                $CompetitionRoi({
                  claimMap,
                  parentRoute: rootRoute,
                  parentStore: rootStore,
                  competitionCumulativeRoi: map((x: IPageParapApi<IAccountLadderSummary>) => {
                    return { ...x, page: x.page.map(obj => ({ ...fromJson.accountSummaryJson(obj), pnl: BigInt(obj.pnl), roi: BigInt(obj.roi) })) }
                  }, clientApi.competitionCumulativeRoi),
                })({
                  competitionCumulativeRoi: competitionCumulativeRoiTether(map(page => {
                    return { ...page, from: COMPETITION_START, to: COMPETITION_END }
                  })),
                  routeChange: linkClickTether()
                })
              )
            ),


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


