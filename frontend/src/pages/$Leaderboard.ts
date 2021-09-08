import { $text, component, style, styleBehavior, StyleCSS, nodeEvent, stylePseudo } from "@aelea/dom"
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state, $icon } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, now, startWith, switchLatest } from '@most/core'
import { Account, formatFixed, formatReadableUSD, IClaim, intervalInMsMap, LeaderboardApi, IAggregatedAccountSummary } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountLabel, $AccountPhoto, $ProfileLinks } from '../components/$AccountProfile'
import { Behavior } from "@aelea/core"
import { $Link } from "../components/$Link"
import { screenUtils } from "@aelea/ui-components"
import { $caretDown } from "../elements/$icons"



export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<IClaim[]>

  leaderboardQuery: Stream<IAggregatedAccountSummary[]>

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

  const $header = $text(style({ fontSize: '1.45em', letterSpacing: '4px' }))

  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const timeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x)))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)


  const topGMX: Stream<TablePageResponse<IAggregatedAccountSummary>> = map((tournament) => {
    return {
      data: tournament
    }
  }, config.leaderboardQuery)


  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $column(layoutSheet.spacingBig, style({ maxWidth: '1024px', padding: '0 12px', width: '100%', alignSelf: 'center' }))(
      $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
        $row(layoutSheet.spacing)(
          $header(layoutSheet.flex, style({ color: pallete.foreground }))(`Leaderboard`),
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
      $card(layoutSheet.spacingBig, style({ padding: screenUtils.isMobileScreen ? '16px 8px' : '46px', margin: '0 -12px' }))(
        $column(layoutSheet.spacing)(

          switchLatest(map((dataSource) => {
            return $Table<IAggregatedAccountSummary>({
              bodyContainerOp: O(layoutSheet.spacingBig),
              dataSource: now(dataSource),
              bodyRowOp: O(layoutSheet.spacingBig, style({ gap: '30px' })),
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
                  columnOp: style({ flex: 3 }),
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
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(`${x.profitablePositionsCount}/${x.settledPositionCount - x.profitablePositionsCount}`)
                  })
                },
                {
                  $head: $text('Leverage'),
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(`${String(x.leverage)}x`)
                  })
                },
                {
                  $head: $text('Settled PnL'),
                  columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
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

    {
      leaderboardQuery: timeFrame,
      openTradesQuery : now(null),
      routeChange
    }
  ]
})


