import { $text, Behavior, component, style, StyleCSS } from '@aelea/core'
import { $column, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'

import {  ETH_ADDRESS_REGEXP } from 'gambit-middleware'
import { Route } from '@aelea/router'
import { Stream } from '@most/types'
import { BaseProvider } from '@ethersproject/providers'
import * as router from '@aelea/router'
import { $Profile } from './$Profile'
import { Claim } from '../../logic/types'





export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<Claim[]>

  parentStore: <T, TK extends string>(key: string, intitialState: T) => state.BrowserStore<T, TK>;

}



enum TimeFrame {
  None,
  Day,
  Month,
}

// const timeFrameToRangeOp = map((xxx: TimeFrame): LeaderboardApi => {
//   const nowTime = new Date()

//   const startTime = xxx === TimeFrame.Day
//     ? nowTime.setHours(nowTime.getHours() - 24)
//     : xxx === TimeFrame.Month
//       ? nowTime.setMonth(nowTime.getMonth() - 1)
//       : new Date(0).getTime()

//   return { startTime }
// })

export const $Portfolio = <T extends BaseProvider>(config: IPortfolio<T>) => component((
  [initializeLeaderboard, initializeLeaderboardTether]: Behavior<any, TimeFrame>,
) => {

  const $header = $text(style({ fontSize: '1.45em', fontWeight: 'lighter', letterSpacing: '4px' }))


  const accountRoute = config.parentRoute.create({
    fragment: ETH_ADDRESS_REGEXP,
    title: 'Account'
  })


  return [
    $column(
      $column(layoutSheet.spacingBig)(
        router.match(accountRoute)(
          $Profile({
            parentStore: config.parentStore,
            claimList: config.claimList
          })({})
        ),

      ),
    )
  ]
})

