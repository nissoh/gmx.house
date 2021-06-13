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


const USD_DECIMALS = 30



// fetch('/api/claim-account', {
//   method: 'POST', // *GET, POST, PUT, DELETE, etc.
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify({ tx: '0xc8842adcf564afaa616e4147030941d1841853062de8d6d5da52b724c0440c28' }) // body data type must match "Content-Type" header
// })


export interface IPortfolio<T extends BaseProvider> {
  parentRoute: Route
  provider?: Stream<T>
  claimList: Stream<Claim[]>

  parentStore: <T>(key: string, intitialState: T) => state.BrowserStore<T>;

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

