import { Behavior, combineArray, O, Op } from "@aelea/core"
import { $element, $node, $text, attr, component, IBranch, nodeEvent, style } from "@aelea/dom"
import { Route } from '@aelea/router'
import { $column, $icon, $Popover, $row, $seperator, layoutSheet, screenUtils, state } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { combine, constant, empty, filter, map, startWith, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { CHAIN, IClaim } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $tradeGMX } from '../common/$tradeButton'
import { dark, light } from '../common/theme'
import { $Link } from './$Link'
import { $moreDots } from "../elements/$icons"
import { $AccountPreview, $disconnectedWalletDisplay } from "./$AccountProfile"
import { $IntermediateConnect } from "./$ConnectAccount"
import { $Picker } from './$ThemePicker'
import { $ButtonSecondary } from "./form/$Button"
import { CHAIN_LABEL_ID } from "../types"
import { $defaultSelectContainer, $Dropdown } from "./$Dropdown"




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">

  claimMap: Stream<{ [k: string]: IClaim }>

  showAccount?: boolean
}

export const $MainMenu = ({ walletLink, parentRoute, containerOp = O(), claimMap, showAccount = true, walletStore }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [profileLinkClick, profileLinkClickTether]: Behavior<any, any>,
  [walletChange, walletChangeTether]: Behavior<any, IEthereumProvider | null>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [changeChain, changeChainTethr]: Behavior<keyof typeof CHAIN_LABEL_ID, keyof typeof CHAIN_LABEL_ID>,

) => {

  const urlFragments = document.location.pathname.split('/')
  const [chainFragment] = urlFragments.slice(1) as [keyof typeof CHAIN_LABEL_ID]

  const chainLabel = chainFragment || 'arbitrum'

  const $menuLinks = [
    $Link({ $content: $text('Leaderboard'), url: `/${chainLabel}/leaderboard`, route: parentRoute.create({ fragment: 'leaderboard' }) })({
      click: routeChangeTether()
    }),
    $tradeGMX
  ]

  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em', alignItems: 'center' }), containerOp)(

      ...screenUtils.isDesktopScreen
        ? $menuLinks 
        : [],

      $Popover({
        dismiss: profileLinkClick,
        $$popContent: combineArray((_) => {
          return $column(layoutSheet.spacingBig)(

            ...screenUtils.isMobileScreen
              ? $menuLinks.reverse()
              : [],
            
            $node(),

            $Picker([light, dark])({}),

            $IntermediateConnect({
              walletStore,
              $display: $ButtonSecondary({
                $content: $text('Change Wallet')
              })({
                click: walletChangeTether(
                  map(pe => {
                    pe.preventDefault()
                    pe.stopImmediatePropagation()
                  }),
                  // awaitPromises,
                  constant(null)
                )
              }),
              walletLink
            })({
              walletChange: walletChangeTether()
            }),

          )
        }, clickPopoverClaim),
      })(
        switchLatest(combine((account, chain) => {

          return $row(layoutSheet.spacing)(


            $icon({
              svgOps: O(
                clickPopoverClaimTether(nodeEvent('click')),
                style({
                  padding: '6px',
                  cursor: 'pointer',
                  alignSelf: 'center',
                  transform: 'rotate(90deg)',
                  border: `1px solid ${pallete.middleground}`,
                  borderLeft: 0, borderRadius: '30px'
                })
              ),
              width: '32px',
              $content: $moreDots,
              viewBox: '0 0 32 32'
            }),

            $row(style({ border: `1px solid ${pallete.middleground}`, borderLeft: 0, borderRadius: '30px' }))(
              account
                ? $AccountPreview({
                  parentRoute,
                  address: account,
                  chain: chain === CHAIN.ARBITRUM || chain === CHAIN.AVALANCHE ? chain : CHAIN.ARBITRUM
                })({ profileClick: O(profileLinkClickTether(), routeChangeTether()) })
                : O(clickPopoverClaimTether(nodeEvent('click')), style({ cursor: 'pointer' }))(
                  $disconnectedWalletDisplay()
                ),
              style({ marginLeft: '6px', backgroundColor: colorAlpha(pallete.message, 0.25), width: '1px' }, $seperator),
              style({ backgroundColor: colorAlpha(pallete.message, 0.25), width: '1px' }, $seperator),
              $Dropdown({
                value: startWith(chainLabel, filter(selection => {
                  document.location.assign(document.location.href.replace(chainLabel, selection.toLowerCase()))
                  return false
                }, changeChain)),
                $container: $column(style({ alignSelf: 'center' })),
                // disabled: accountChange,
                // $noneSelected: $text('Choose Amount'),
                $selection: map(label => {
                  return $element('img')(attr({ src: `/assets/${label.toLowerCase()}.svg` }), style({ margin: '0 6px', width: '32px', cursor: 'pointer', padding: '2px 4px' }))()
                }),
                select: {
                  optionOp: map(option => $row(style({ alignItems: 'center', width: '100%' }))(
                    $element('img')(attr({ src: `/assets/${option.toLowerCase()}.svg` }), style({ width: '32px', padding: '3px 6px' }))(),
                    $text(option)
                  )),
                  $container: $defaultSelectContainer(style({ left: 'auto', right: 0 })),

                  options: [
                    "Arbitrum",
                    "Avalanche",
                  ],
                }
              })({ select: changeChainTethr() }),
            )
          )
        }, walletLink.account, walletLink.network)),
      )({
        // overlayClick: clickPopoverClaimTether()
      }),


    ),


    { routeChange, walletChange }
  ]
})


