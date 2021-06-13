import { $text, Behavior, event, component, style, styleBehavior, StyleCSS } from '@aelea/core'
import { combineArray, O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, startWith, switchLatest } from '@most/core'
import { formatReadableUSD } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { $alert, $anchor } from '../elements/$common'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { leaderBoardQuery, liquidationsQuery } from '../logic/leaderboard'
import { $AccountProfile } from '../components/$AccountProfile'
import { LeaderboardApi } from 'gambit-backend'
import { Account, Claim } from '../logic/types'
import { intervalInMsMap } from '../logic/constant'



export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<Claim[]>

  parentStore: <T>(key: string, intitialState: T) => state.BrowserStore<T>;
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

  const timeFrameState = multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)
  
  
  const topGambit: Stream<Stream<TablePageResponse<Account>>> = map((params: LeaderboardApi) => {

    return combineArray((settled, liqs) => {

      const topMap = settled.reduce((seed, pos) => {
        const account = seed[pos.account] ??= {
          address: pos.account,
          settledPositionCount: 0,
          claim: null,
          profitablePositionsCount: 0,
          realisedPnl: 0n,
          settledPositions: [],
        }

        account.settledPositions.push(pos)
        account.settledPositionCount++
        account.realisedPnl += pos.realisedPnl

        if (pos.realisedPnl > 0n) {
          account.profitablePositionsCount++
        }

        return seed
      }, {} as {[account: string]: Account})

      const allAccounts = Object.values(topMap)
      
      liqs.forEach(liq => {
        const liqqedTopAccount = topMap[liq.account]
        if (liqqedTopAccount) {
          liqqedTopAccount.realisedPnl -= liq.collateral
          liqqedTopAccount.settledPositionCount++
        }
      })

      return {
        data: allAccounts
          .sort((a, b) => Number(b.realisedPnl - a.realisedPnl))
          // .filter(a => a.realisedPnl > 0)
      }
    }, leaderBoardQuery(params), liquidationsQuery(params))
  }, timeFrame)




  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $column(layoutSheet.spacingBig, style({ maxWidth: '870px', width: '100%', alignSelf: 'center' }))(
      $row(style({ placeContent: 'center' }))(
        $alert(
          $text(`Fees are unaccounted in Realised P/L (WIP)`)
        ),
      ),
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
      $card(layoutSheet.spacingBig, style({ padding: '46px' }))(
        $column(layoutSheet.spacing)(

          switchLatest(map((dataSource) => {
            return $Table<Account>({
              bodyContainerOp: O(layoutSheet.spacing),
              dataSource,
              columns: [
                {
                  $head: $text('Account'),
                  columnOp: style({  }),
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
                  $head: $text('Wins'),
                  columnOp: style({ maxWidth: '100px', placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(String(x.profitablePositionsCount))
                  })
                },
                {
                  $head: $text('Losses'),
                  columnOp: style({ maxWidth: '100px', placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(String(x.settledPositionCount - x.profitablePositionsCount))
                  })
                },
                {
                  $head: $text('realisedPnl'),
                  columnOp: style({ placeContent: 'flex-end', maxWidth: '160px' }),
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
  ]
})


