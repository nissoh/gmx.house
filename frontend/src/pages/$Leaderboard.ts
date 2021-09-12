import { $text, component, style, styleBehavior, StyleCSS, nodeEvent, stylePseudo, $node } from "@aelea/dom"
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, filter, map, merge, multicast, now, startWith, switchLatest } from '@most/core'
import { formatFixed, formatReadableUSD, IClaim, intervalInMsMap, LeaderboardApi, IAggregatedAccountSummary, IAggregatedTradeOpen, parseFixed, ARBITRUM_CONTRACTS, toAggregatedOpenTradeSummary, calculatePositionDelta, IAggregatedTradeSummary } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from '../components/$AccountProfile'
import { Behavior } from "@aelea/core"
import { $Link } from "../components/$Link"
import { screenUtils } from "@aelea/ui-components"
import { klineWS, WSBTCPriceEvent } from "../binance-api"
import { $icon } from "../common/$icons"
import { $bear, $bull } from "../elements/$icons"



export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<IClaim[]>

  leaderboardQuery: Stream<IAggregatedAccountSummary[]>
  openAggregatedTrades: Stream<IAggregatedTradeOpen[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;
}




const timeFrameToRangeOp = map((timeSpan: intervalInMsMap): LeaderboardApi => {
  const now = Date.now()

  return { timeRange: [now - timeSpan, now] }
})

export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [initializeLeaderboard, initializeLeaderboardTether]: Behavior<any, intervalInMsMap>,

  [routeChange, routeChangeTether]: Behavior<string, string>,

) => {

  const $header = $text(style({ fontSize: '1.15em', letterSpacing: '4px' }))

  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const timeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x)))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)
  const priceChange = multicast(klineWS('ethusdt@aggTrade', 'btcusdt@aggTrade'))


  const topGMX: Stream<TablePageResponse<IAggregatedAccountSummary>> = map((tournament) => {
    return {
      data: tournament
    }
  }, config.leaderboardQuery)

  const openPositions: Stream<TablePageResponse<IAggregatedTradeSummary>> = map((data) => {
    return {
      data: data
        // .filter(a => a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70')
        .map(toAggregatedOpenTradeSummary)
        .sort((a, b) => formatFixed(b.collateral) - formatFixed(a.collateral))
    }
  }, config.openAggregatedTrades)


  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $node(style({ gap: '46px', display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row' }))(
      $column(layoutSheet.spacing, style({ maxWidth: '610px', padding: '0 12px', minWidth: '574px' }))(
        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $row(layoutSheet.spacing)(
            $header(layoutSheet.flex)(`Top Settled`),
          // $header(layoutSheet.flex)(`Settled`),
          // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
          ),
          $row(layoutSheet.flex)(),

          $text(style({ color: pallete.foreground }))('Time Frame:'),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.DAY ? activeTimeframe : null, timeFrameState)),
            initializeLeaderboardTether(nodeEvent('click'), constant(intervalInMsMap.DAY))
          )(
            $text('24Hrs')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.WEEK ? activeTimeframe : null, timeFrameState)),
            initializeLeaderboardTether(nodeEvent('click'), constant(intervalInMsMap.WEEK))
          )(
            $text('Week')
          ),
          $anchor(
            styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, timeFrameState)),
            initializeLeaderboardTether(nodeEvent('click'), constant(intervalInMsMap.MONTH))
          )(
            $text('Month')
          )
        ),
        $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '26px', margin: '0 -12px' }))(
          $column(layoutSheet.spacing)(
            switchLatest(map((dataSource) => {
              return $Table<IAggregatedAccountSummary>({
                bodyContainerOp: O(layoutSheet.spacingBig),
                dataSource: now(dataSource),
                bodyRowOp: O(layoutSheet.spacingBig, style({ gap: '18px' })),
                columns: [
                  ...screenUtils.isDesktopScreen ? [{
                    $head: $text('Rank'),
                    columnOp: style({ flex: .5, placeContent: 'center' }),
                    valueOp: map((x: IAggregatedAccountSummary) => {
                      const idx = dataSource.data.indexOf(x) + 1
                      return $text(`#${idx}`)
                    })
                  }] : [],
                  {
                    $head: $text('Account'),
                    columnOp: style({ flex: 2 }),
                    valueOp: map(({ address }) => {
                      return switchLatest(
                        map((claimList: IClaim[]) => {
                          const claim = claimList?.find(c => c.address === address) || null

                          const $profileAnchor = $Link({
                            $content: $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }), stylePseudo(':hover', {  textDecoration: 'underline' }))(
                              $AccountPhoto(address, claim),
                              $AccountLabel(address, claim),
                            ),
                            url: `/p/account/${address}`,
                            route: config.parentRoute.create({ fragment: '2121212' })
                          })({
                            click: routeChangeTether()
                          })


                          return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                            $profileAnchor,
                            $ProfileLinks(address, claim),
                          )
                        }, now(null) as any)
                      )
                    })
                  },
                  {
                    $head: $text('Win / Loss'),
                    columnOp: style({ flex: 1.25, placeContent: 'center' }),
                    valueOp: map(x => {
                      return $text(`${x.profitablePositionsCount}/${x.settledPositionCount - x.profitablePositionsCount}`)
                    })
                  },
                  {
                    $head: $text('Risk'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, flexDirection: 'column', textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
                    valueOp: map(x => {
                      return merge(
                        $text(style({ fontSize: '.65em' }))(formatReadableUSD(x.collateral)),
                        $text(`${String(x.leverage)}x`),
                      )
                    })
                  },
                  {
                    $head: $text('PnL $'),
                    columnOp: style({ flex: 1.5, placeContent: 'flex-end', maxWidth: '160px' }),
                    valueOp: map(x => {
                      const str = formatReadableUSD(x.realisedPnl - x.fees)
                      return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(str)
                    })
                  },
                ],
              })({})
            }, topGMX))
          ),
        ),
      ),
      $column(layoutSheet.spacing, style({ flex: 1, padding: '0 12px' }))(
        $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
          $row(layoutSheet.spacing)(
            $header(layoutSheet.flex)(`Top Open`),
          // $header(layoutSheet.flex)(`Settled`),
          // $icon({ $content: $caretDown, viewBox: '0 0 32 32', width: '8px', svgOps: style({ marginTop: '4px' }) })
          ),
        ),
        $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '26px', margin: '0 -12px' }))(
          $column(layoutSheet.spacing)(
            switchLatest(map((dataSource) => {
              return $Table<IAggregatedTradeSummary>({
                bodyContainerOp: O(layoutSheet.spacingBig),
                dataSource: now(dataSource),
                bodyRowOp: O(layoutSheet.spacingBig, style({ gap: '18px' })),
                columns: [
                  {
                    $head: $text('S|L'),
                    columnOp: style({ minWidth: '38px', flex: 0 }),
                    valueOp: map(({ isLong }) => {
                      return $icon({
                        $content: isLong ? $bull : $bear, 
                        viewBox: '0 0 32 32'
                      })
                    })
                  },
                  {
                    $head: $text('Account'),
                    columnOp: style({ flex: 3 }),
                    valueOp: map(({ account }) => {
                      return switchLatest(
                        map((claimList: IClaim[]) => {
                          const claim = claimList?.find(c => c.address === account) || null

                          const $profileAnchor = $Link({
                            $content: $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }), stylePseudo(':hover', {  textDecoration: 'underline' }))(
                              $AccountPhoto(account, claim),
                              $AccountLabel(account, claim),
                            ),
                            url: `/p/account/${account}`,
                            route: config.parentRoute.create({ fragment: '2121212' })
                          })({
                            click: routeChangeTether()
                          })


                          return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                            $profileAnchor,
                            $ProfileLinks(account, claim),
                          )
                        }, now(null) as any)
                      )
                    })
                  },
                  {
                    $head: $text('Risk'),
                    columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, flexDirection: 'column', textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
                    valueOp: map(pos => {

                      return merge(
                        $text(style({ fontSize: '.65em' }))(formatReadableUSD(pos.collateral - pos.fee)),
                        $text(`${String(pos.leverage)}x`),
                      )
                    })
                  },
                  {
                    $head: $text('PnL $'),
                    columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                    valueOp: map((pos) => {

                      const filterByIndexToken = filter((data: WSBTCPriceEvent) => {
                        return (
                          pos.indexToken === ARBITRUM_CONTRACTS.BTC && data.s === 'BTCUSDT' ||
                          pos.indexToken === ARBITRUM_CONTRACTS.WETH && data.s === 'ETHUSDT'
                        )
                      })

                      const pnlPosition = map(price => {
                        const markPrice = parseFixed(price.p, 30)

                        return calculatePositionDelta(pos.size, pos.collateral, pos.isLong, pos.averagePrice, markPrice)
                      }, filterByIndexToken(priceChange))

                      return $column(
                        $text(styleBehavior(map(s => ({ color: s.hasProfit ? pallete.positive : pallete.negative }), pnlPosition)))(
                          map(meta => {

                            const pnl = formatReadableUSD(meta.delta - pos.fee)
                            return `${meta.hasProfit ? pnl : `${pnl.startsWith('-') ? pnl : '-' + pnl}`}`
                          }, pnlPosition),
                        ),
                        // $text(style({ fontSize: '.65em' }))(
                        //   map(meta => readableNumber(formatFixed(meta.deltaPercentage, 2)) + '%', pnlPosition),
                        // ),
                      )
                    })
                  },
                ],
              })({})
            }, openPositions))
          ),
        ),
      )
    ),

    {
      requestAggregatedTradeList: timeFrame,
      openTradesQuery: now(null),
      requestOpenAggregatedTrades: timeFrame,
      routeChange
    }
  ]
})


