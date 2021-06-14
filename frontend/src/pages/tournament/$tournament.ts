import { $text, Behavior, event, component, style, styleBehavior, StyleCSS } from '@aelea/core'
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, map, multicast, startWith, switchLatest } from '@most/core'
import { formatReadableUSD } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { LeaderboardApi } from 'gambit-backend'
import { Claim } from 'gambit-backend/src/dto/Account'
import { $AccountProfile } from '../../components/$AccountProfile'
import { $alert, $anchor } from '../../elements/$common'
import { intervalInMsMap } from '../../logic/constant'
import { tournament1Query } from '../../logic/leaderboard'
import { Account } from '../../logic/types'




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

export const $Tournament = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
  [initializeLeaderboard, initializeLeaderboardTether]: Behavior<any, intervalInMsMap>,
) => {

  const $header = $text(style({ fontSize: '1.45em', letterSpacing: '4px' }))

  const timeFrameStore = config.parentStore('timeframe', intervalInMsMap.DAY)

  const timeFrameState = multicast(startWith(timeFrameStore.state, timeFrameStore.store(initializeLeaderboard, map(x => x))))
  const timeFrame = timeFrameToRangeOp(timeFrameState)
  
  
  const topGambit: Stream<Stream<TablePageResponse<Account>>> = map((params: LeaderboardApi) => {

    return map(({liquidatedPositions, closedPositions}) => {
      const topMap = closedPositions.reduce((seed, pos) => {
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
      
      liquidatedPositions.forEach(liq => {
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
    }, tournament1Query())
  }, timeFrame)




  const activeTimeframe: StyleCSS = { color: pallete.primary, pointerEvents: 'none' }
  return [
    $column(layoutSheet.spacingBig, style({ maxWidth: '870px', width: '100%', alignSelf: 'center' }))(
      $row(style({ placeContent: 'center' }))(
        $alert(
          $text(`Fees are unaccounted in Realised PnL (WIP)`)
        ),
      ),
      $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
        $row(
          $header(layoutSheet.flex)('Tournament Season 1'),
        ),
        $row(layoutSheet.flex)(),

        $text(style({ color: pallete.foreground }))('Time Frame:'),
        $text('14 June 2021, 12:00 - 30 June 2021, 12:00'),
        $text(style({ color: pallete.foreground}))('UTC'),
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
                  $head: $text('Wins'),
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(String(x.profitablePositionsCount))
                  })
                },
                {
                  $head: $text('Losses'),
                  columnOp: style({ flex: 1, placeContent: 'center' }),
                  valueOp: map(x => {
                    return $text(String(x.settledPositionCount - x.profitablePositionsCount))
                  })
                },
                {
                  $head: $text('Realised PnL'),
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
  ]
})


