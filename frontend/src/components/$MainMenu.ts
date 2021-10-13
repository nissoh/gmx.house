import { $text, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { $Button, $column, $icon, $Popover, $row, $seperator, layoutSheet } from '@aelea/ui-components'
import { $Link } from '../components/$Link'
import { Route } from '@aelea/router'
import { O, Op } from '@aelea/utils'
import { awaitPromises, constant, empty, map, now, switchLatest, tap } from '@most/core'
import { $Picker } from './$ThemePicker'
import { dark, light } from '../common/theme'
import { $tradeGMX } from '../common/$tradeButton'
import { Behavior, combineArray } from "@aelea/core"
import { $AccountPhoto, $AccountPreview, $ProfilePreviewClaim } from "./$AccountProfile"
import { $moreDots } from "../elements/$icons"
import { pallete } from "@aelea/ui-components-theme"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { IWalletLink } from "wallet-link"
import { IClaim } from "gambit-middleware"




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: Stream<IWalletLink | null>
  claimMap: Stream<Map<string, IClaim>>
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), claimMap }: MainMenu) => component((
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
      style({ height: '20px' }, $seperator),

      $Popover({
        dismiss: profileLinkClick,
        $$popContent: combineArray((_, cmap, wl) => {
          return $column(layoutSheet.spacing)(
            $IntermediateDisplay({
              $display: $row(layoutSheet.spacing)(
                switchLatest(
                  map(address => {
                    return $AccountPreview({
                      address: address,
                      claim: cmap.get(String(address).toLocaleLowerCase()),
                      parentRoute,
                    })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) })
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
            })({ walletChange: walletChangeTether() }),
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

      

     
    ),


    { routeChange, walletChange }
  ]
})


