import { $text, component, style } from '@aelea/core'
import { O, } from '@aelea/utils'
import { $card, $column, $row, layoutSheet, $Table, TablePageResponse, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { map, switchLatest } from '@most/core'
import { formatReadableUSD, getPositionFee } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import { Claim } from 'gambit-backend/src/dto/Account'
import { $AccountProfile } from '../../components/$AccountProfile'
import { tournament1Query } from '../../logic/leaderboard'
import { Account } from '../../logic/types'
import { isMobileScreen } from '../../common/utils'


export interface ILeaderboard<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<Claim[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;
}


export const $Tournament = <T extends BaseProvider>(config: ILeaderboard<T>) => component((
) => {

  const $header = $text(style({ fontSize: '1.45em', letterSpacing: '4px' }))


  const dataSource: Stream<TablePageResponse<Account>> = map((data) => {
    return { data }
  }, tournament1Query())


  return [
    $column(layoutSheet.spacingBig, style({ maxWidth: '870px', padding: '0 12px', width: '100%', alignSelf: 'center' }))(
      $row(layoutSheet.spacing, style({ fontSize: '0.85em' }))(
        $row(
          $header(layoutSheet.flex)('Tournament Season 1'),
        ),
        $row(layoutSheet.flex)(),

        $text(style({ color: pallete.foreground }))('Time Frame:'),
        $text('14 June 2021, 12:00 - 30 June 2021, 12:00'),
        $text(style({ color: pallete.foreground }))('UTC'),
      ),
      $card(layoutSheet.spacingBig, style({ padding: isMobileScreen ? '16px 8px' : '46px', margin: '0 -12px' }))(
        $column(layoutSheet.spacing)(

          $Table<Account>({
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
        ),

      ),
    ),
  ]
})


