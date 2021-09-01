import { $text, component, IBranch, style } from "@aelea/dom"
import { $row, layoutSheet } from '@aelea/ui-components'
import { $Link } from '../components/$Link'
import { Route } from '@aelea/router'
import { combineArray, O, Op } from '@aelea/utils'
import { now, switchLatest } from '@most/core'
import { $IntermediateDisplay } from './$ConnectAccount'
import { $AccountProfile } from './$AccountProfile'
import { Stream } from '@most/types'
import { $Picker } from './$ThemePicker'
import { dark, light } from '../common/theme'
import { IClaim } from 'gambit-middleware'
import { $tradeGMX } from '../common/$tradeButton'
import { Behavior } from "@aelea/core"




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>,
  claimList: Stream<IClaim[]>
}

export const $MainMenu = ({ parentRoute, containerOp = O(), claimList }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [walletConnectedSucceed, walletConnectedSucceedTether]: Behavior<string, string>,
) => {

  const leaderboardRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = parentRoute.create({ fragment: 'examples', title: 'Examples' })
  
  // const $accountDisplay = $IntermediateDisplay({
  //   $display: switchLatest(
  //     combineArray((address, claimList) => {
  //       const claim = claimList.find(c => c.address === address) || null

  //       return $AccountProfile({ address, claim })({})
  //       // return $Link({ $content: $text('Portfolio'), url: '/p/account', route: examplesRoute })({
  //       //   click: routeChangeTether()
  //       // })
  //     }, walletConnectedSucceed, claimList)
  //   )
  // })({
  //   connectedWalletSucceed: walletConnectedSucceedTether()
  // })
  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', alignItems: 'center' }), containerOp)(
      $Picker([light, dark])({}),
      // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
      //   click: sampleLinkClick()
      // }),
      $Link({ $content: $text('API(WIP)'), disabled: now(true), url: '/p/examples/theme', route: examplesRoute })({
        click: routeChangeTether()
      }),
      $Link({ $content: $text('Leaderboard'), url: '/p/leaderboard', route: leaderboardRoute })({
        click: routeChangeTether()
      }),
      $tradeGMX
      // $accountDisplay
    ),


    { routeChange }
  ]
})


