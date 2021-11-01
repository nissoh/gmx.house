import { Behavior, combineArray, O, Op } from "@aelea/core"
import { $text, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $Button, $column, $icon, $Popover, $row, $seperator, layoutSheet } from '@aelea/ui-components'
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, switchLatest, tap } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { IClaim } from "gambit-middleware"
import { IWalletLink } from "wallet-link"
import { $tradeGMX } from '../common/$tradeButton'
import { dark, light } from '../common/theme'
import { $Link } from '../components/$Link'
import { $moreDots } from "../elements/$icons"
import { $AccountPreview } from "./$AccountProfile"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $Picker } from './$ThemePicker'




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: Stream<IWalletLink | null>
  claimMap: Stream<Map<string, IClaim>>

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), claimMap, showAccount = true }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,

) => {

  const leaderboardRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
 
  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', alignItems: 'center' }), containerOp)(

      $Link({ $content: $text('Leaderboard'), url: '/p/leaderboard', route: leaderboardRoute })({
        click: routeChangeTether()
      }),
      $tradeGMX,
      showAccount ? style({ height: '20px' }, $seperator) : empty(),
      showAccount
        ? $Popover({
          dismiss: profileLinkClick,
          $$popContent: combineArray((_, cmap, wl) => {
            return $column(layoutSheet.spacingBig)(
              $IntermediateDisplay({
                $display: $row(layoutSheet.spacing)(
                  switchLatest(
                    map(address => {
                      return address ? 
                        $AccountPreview({
                          address: address,
                          claim: cmap.get(String(address).toLocaleLowerCase()),
                          parentRoute,
                        })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) })
                        : empty()
                    }, wl?.account || empty())
                  ),
                
                  $seperator,
                  $Button({
                    $content: $text('Change')
                  })({
                    click: walletChangeTether(
                      map(pe => {
                        pe.preventDefault()
                        pe.stopImmediatePropagation()
                      }),
                      // awaitPromises,
                      constant(null)
                    )
                  })
                ),
                walletLink
              })({
                walletChange: walletChangeTether()
              }),
              $Picker([light, dark])({})
            )
          }, clickPopoverClaim, claimMap, walletLink),
        })(
          $row(clickPopoverClaimTether(nodeEvent('click')))(
            $icon({
              svgOps: style({
                border: `1px solid ${pallete.foreground}`,
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer'
              }),
              width: '32px',
              $content: $moreDots,
              viewBox: '0 0 32 32'
            })
          )
        )({
        // overlayClick: clickPopoverClaimTether()
        })
        : empty()

      

     
    ),


    { routeChange, walletChange }
  ]
})


