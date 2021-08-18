import { $text, Behavior, event, component, style, styleBehavior, StyleCSS, attr } from '@aelea/core'
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, now, startWith, switchLatest, tap } from '@most/core'
import { Account, formatFixed, formatReadableUSD, IClaim, intervalInMsMap, LeaderboardApi, IAccountAggregatedSummary } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { $AccountProfile } from '../components/$AccountProfile'
import { isMobileScreen } from '../common/utils'



export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<IClaim[]>

  leaderboardQuery: Stream<Account[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;
}




const timeFrameToRangeOp = map((timeSpan: intervalInMsMap): LeaderboardApi => {
  const now = Date.now()

  return { timeRange: [now - timeSpan, now] }
})

export const $Leaderboard = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [initializeLeaderboard, initializeLeaderboardTether]: Behavior<any, intervalInMsMap>,
) => {

  const $header = $text(style({ fontSize: '1.45em', letterSpacing: '4px' }))

  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const timeFrameState = state.replayLatest(multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x)))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)
  

  const topGambit: Stream<TablePageResponse<IAccountAggregatedSummary>> = map((tournament) => {
    return { data: tournament }
  }, config.leaderboardQuery)


  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $column(layoutSheet.spacingBig, style({ maxWidth: '870px', padding: '0 12px', width: '100%', alignSelf: 'center' }))(
      $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
        $row(
          $header(layoutSheet.flex)('Top Gambit'),
        ),
        $row(layoutSheet.flex)(),

        $text(style({ color: pallete.foreground }))('Time Frame:'),
        $anchor(
          styleBehavior(map(tf => tf === intervalInMsMap.DAY ? activeTimeframe : null, timeFrameState)),
          initializeLeaderboardTether(event('click'), constant(intervalInMsMap.DAY))
        )(
          $text('24Hrs')
        ),
        $anchor(
          styleBehavior(map(tf => tf === intervalInMsMap.WEEK ? activeTimeframe : null, timeFrameState)),
          initializeLeaderboardTether(event('click'), constant(intervalInMsMap.WEEK))
        )(
          $text('Week')
        ),
        $anchor(
          styleBehavior(map(tf => tf === intervalInMsMap.MONTH ? activeTimeframe : null, timeFrameState)),
          initializeLeaderboardTether(event('click'), constant(intervalInMsMap.MONTH))
        )(
          $text('Month')
        )
      ),
      $card(layoutSheet.spacingBig, style({ padding: isMobileScreen ? '16px 8px' : '46px', margin: '0 -12px' }))(
        $column(layoutSheet.spacing)(

          switchLatest(map((dataSource) => {
            return $Table<IAccountAggregatedSummary>({
              bodyContainerOp: O(layoutSheet.spacing),
              dataSource: now(dataSource),
              columns: [
                {
                  $head: $text('Account'),
                  columnOp: style({ flex: 4 }),
                  valueOp: map(x => {
                    return switchLatest(
                      map(claimList => {
                        const claim = claimList.find(c => c.address === x.address) || null
                        return $AccountProfile({ address: x.address, claim })({})
                      }, config.claimList)
                    )
                  })
                },
                {
                  $head: $text('Win/Loss'),
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(`${x.profitablePositionsCount}/${x.settledPositionCount - x.profitablePositionsCount}`)
                  })
                },
                {
                  $head: $text('Leverage'),
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(`${formatFixed(x.leverage, 4).toFixed(1)}x`)
                  })
                },
                {
                  $head: $text('PnL Open/Settled'),
                  columnOp: style({ flex: 2, placeContent: 'flex-end', maxWidth: '160px' }),
                  valueOp: map(x => {
                    const str = formatReadableUSD(x.realisedPnl)
                    return $text(style({ color: str.indexOf('-') > -1 ? pallete.negative : pallete.positive }))(str)
                  })
                },
              ],
            })({})
          }, topGambit))
        ),

      ),
    ),

    {
      leaderboardQuery: timeFrame
    }
  ]
})


