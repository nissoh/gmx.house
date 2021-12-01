import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, INode, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from '@aelea/ui-components-theme'
import { at, empty, map, merge, mergeArray, multicast, now, switchLatest } from '@most/core'
import { IEthereumProvider } from "eip1193-provider"
import {
  AccountHistoricalDataApi, fromJson, groupByMap, IAggregatedAccountSummary,
  IAggregatedOpenPositionSummary, IIdentifiableEntity, ILeaderboardRequest, IPagableResponse,
  IPageable, IPageChainlinkPricefeed, TradeType, TX_HASH_REGEX
} from 'gambit-middleware'
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
  [videoNode, videoNodeTether]: Behavior<INode<HTMLVideoElement>, INode<HTMLVideoElement>>,

  // websocket communication
  [spaceOddity, spaceOddityTether]: Behavior<string, string>,

  [requestLeaderboardTopList, requestLeaderboardTopListTether]: Behavior<ILeaderboardRequest, ILeaderboardRequest>,
  [requestOpenAggregatedTrades, requestOpenAggregatedTradesTether]: Behavior<IPageable, IPageable[]>,
  [requestAccountAggregation, requestAccountAggregationTether]: Behavior<AccountHistoricalDataApi, AccountHistoricalDataApi>,
  [requestChainlinkPricefeed, requestChainlinkPricefeedTether]: Behavior<IPageChainlinkPricefeed, IPageChainlinkPricefeed>,
  [requestAggregatedTrade, requestAggregatedTradeTether]: Behavior<IIdentifiableEntity, IIdentifiableEntity>,
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
  const pagesRoute = rootRoute.create({ fragment: 'p', title: 'aelea' })
  const leaderboardRoute = pagesRoute.create({ fragment: 'leaderboard', title: 'Leaderboard' })
  const accountRoute = pagesRoute.create({ fragment: 'account', title: 'Portfolio' })

  const cardRoute = rootRoute
    .create({ fragment: 'card' })
    .create({
      fragment: new RegExp(`^(${TradeType.OPEN}|${TradeType.CLOSED}|${TradeType.LIQUIDATED})$`)
    })
    .create({ fragment: TX_HASH_REGEX, title: 'Trade Details' })



  const rootStore = state.createLocalStorageChain('store-3')

  const claimMap = replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )

  const clientApi = helloBackend({
    requestAccountAggregation,
    requestLeaderboardTopList,
    requestOpenAggregatedTrades,
    requestChainlinkPricefeed,
    requestAggregatedTrade,

    spaceOddity
  })

  const walletLink = initWalletLink({
    walletProviders: [wallet.metamask, wallet.walletConnect]
  }, walletChange)


  const msgToGc = 'major tom to ground control'
  const majorTom = merge(
    now(msgToGc),
    switchLatest(map(() => at(10000, msgToGc), clientApi.spaceOddity))
  )

  

  return [

    mergeArray([
      switchLatest(map(() => empty(), spaceOddityTether()(majorTom))),
      $node(designSheet.main, style({ fontWeight: 300, lineHeight: '1.3', backgroundImage: `radial-gradient(70% 71% at 50% 15vh,${pallete.horizon} 0,${pallete.background} 100%)`, alignItems: 'center', placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh', overflow: 'hidden', position: 'relative', maxWidth: '1200px', padding: '0 30px', margin: '0 auto', width: '100%', alignItems: 'center', placeContent: 'center', gap: '100px' }))(

            $node(),
            $row(layoutSheet.spacingBig)(
              $column(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(               

                
                $text(`Trading is accessible within a button click and driven by the stories of the "short-lived" success stories. if you've picked day trading, in the long period you will probably lose money`),
                $text(`most traders are not profitable, and the statistic is worse for leverage traders. 97% have lost their absolute investment and in some cases, their absolte wealth`),
                $text(`Day Trading is one of world's hardest skill to ascertain, it requires the knowledge of learning risks, applying research, mitigating decisions based on emotions and understanding cycles/patterns`),
                $text(`Puppet accesses all of the trading activity that is happening on GMX, this allows the visibility of any trader's historic track record, we use the data to build a platform that allow it's users the ability to pick and choose traders that are likely to give them profit by mirroring their trading strategy`),
                $text(`In the other side of the spectrum traders get paid based on their performance and the amount of investors(puppets) mirroring their strategy`),

                $text(`Defi 2.0 has been trending as the protocol owned liquidity. we think version 3.0 will step into harvesting powerful minds to work for the protocol for the shared benefits`),

                $text(`Puppet is a derived product of GMX.io, they are meant to benefit from each-other as puppet brings new type of investors through it's utility and marketing power. mirror investors are essentially are inherintly performing the actions of the trader that they have chosen to mirror, they pay the exact fees that `),


                $column(layoutSheet.spacingSmall, style({ marginBottom: '20px' }))(
                  $column(style({ marginBottom: '20px' }))(
                    $text(style({ fontSize: '2em', fontWeight: 200 }))('Puppet - Mirror Trading'),
                    $column(
                      $text(style({ fontSize: '.75em', paddingBottom: '6px', color: pallete.message }))(`Don't blindly follow the crowd, Benefit from World's Top Traders`),
                    ),
                  ),

                  $text(`Puppet is a derived product of GMX.io, they are meant to benefit from each-other as puppet brings new type of investors through it's utility and marketing power`),
                  $text(``),
                ),

                $column(layoutSheet.spacingSmall, style({ marginBottom: '20px' }))(
                  $column(style({ marginBottom: '20px', fontWeight: 200, fontSize: '1.1em' }))(
                    $text(style({ fontSize: '1.5em', fontWeight: 700 }))('PUPPET token'),
                    $column(
                      $text(style({ fontSize: '.75em', paddingBottom: '6px', color: pallete.message }))(`Goverance and Protocol owned Liquidity`),
                    ),
                  ),
                  $text(` it has it's own social factors and is well incentiviced to spend marketing budget along with effectivley incentivising traders to promote themselve which ends up benefiting both GMX and Puppet`),
                  $text(`It has hyper price floor which is the composition of it's treasury (Puppet's fees) + (GLP & GMX + rewards), buying the token is owning a % of the treasury and it's appreciated value based on the performance of both platforms Puppet and GMX`),
                ),
              

                // $column(layoutSheet.spacingSmall, style({ marginBottom: '20px' }))(
                //   $column(style({ marginBottom: '20px', fontWeight: 200, fontSize: '1.1em' }))(
                //     $text(style({ fontSize: '1.5em', fontWeight: 700 }))('Technical Contract Abstraction'),
                //     $column(
                //       $text(style({ fontSize: '.75em', paddingBottom: '6px', color: pallete.message }))(`Goverance and Protocol owned Liquidity`),
                //     ),
                //   ),
                //   $text(`aaaa`),
                // ),


              

            
              ),

              $row(style({ flex: 1 }))(
                $element('video')(
                  attr({ muted: '', loop: 'true', autoplay: 'autoplay', src: '/assets/blindTrader.mp4' }),
                  style({ position: 'absolute', maxWidth: '570px' }),
                  videoNodeTether()
                )()
              ),
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
                $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, showAccount: false })({
                  routeChange: linkClickTether(),
                  walletChange: walletChangeTether()
                })
              ),
            ),
            // $cubes(),

          )
        ),

        router.contains(pagesRoute)(
          $column(layoutSheet.spacingBig, style({ fontFamily: 'Noto-Sans-mono', maxWidth: '1080px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
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
          })
        )
      )

    ])
  ]
})


