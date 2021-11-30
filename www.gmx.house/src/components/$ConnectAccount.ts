import { Behavior, combineArray, O } from "@aelea/core"
import { $element, $Node, $text, attr, component, style, styleInline } from "@aelea/dom"
import { $column, $row, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, multicast, now, skipRepeats, snapshot, switchLatest, tap } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { attemptToSwitchNetwork, CHAIN, IWalletLink } from "@gambitdao/wallet-link"
import { $icon, $walletConnectLogo } from "../common/$icons"
import * as wallet from "../common/wallets"
import { $ButtonPrimary } from "./form/$Button"



export interface IIntermediateDisplay {
  $display: $Node
  walletLink: IWalletLink
  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}

export const $IntermediateConnect = (config: IIntermediateDisplay) => component((
  // [connectedWalletSucceed, connectedWalletSucceedTether]: Behavior<any, T>,
  [switchNetwork, switchNetworkTether]: Behavior<PointerEvent, any>,
  [walletChange, walletChangeTether]: Behavior<PointerEvent, IEthereumProvider | null>,
) => {

  const noAccount = skipRepeats(map(x => x === null || x === undefined, tap(console.log, config.walletLink.account)))

  return [
    $column(
      switchLatest(combineArray((metamask, walletProvider, noAccount) => {

        // no wallet connected, show connection flow
        if (noAccount || walletProvider === null) {
            
          const $walletConnectBtn = $ButtonPrimary({
            $content: $row(layoutSheet.spacing)(
              $icon({
                viewBox: '0 0 32 32',
                $content: $walletConnectLogo,
              }),
              $text('Wallet-Connect'),
            ), buttonOp: style({})
          })({
            click: walletChangeTether(
              map(async () => {
                await wallet.walletConnect.enable()

                return wallet.walletConnect
              }),
              awaitPromises,
              src => config.walletStore.store(src, constant('walletConnect')),
            )
          })

          if (metamask) {
            return $column(
              $ButtonPrimary({
                $content: $row(layoutSheet.spacing)(
                  $element('img')(attr({ src: '/assets/metamask-fox.svg' }), style({ width: '24px' }))(),
                  $text('Connect Metamask')
                ), buttonOp: style({})
              })({
                click: walletChangeTether(
                  map(async () => {
                    const metamaskProivder = await wallet.metamaskQuery

                    if (metamaskProivder) {
                      await metamaskProivder.request({ method: 'eth_requestAccounts' })

                      return metamaskProivder
                    }

                    throw new Error('Could not find metmask')
                  }),
                  awaitPromises,
                  src => config.walletStore.store(src, constant('metamask')),
                ),
              }),
              $walletConnectBtn
            )
          } else {  // no mm resolved, show wallet-connect only
            return $walletConnectBtn
          }
        }

        return $column(
          switchLatest(combineArray((chain) => {

            if (chain && chain !== CHAIN.ARBITRUM) {
              return $ButtonPrimary({
                $content: $text('Switch to Arbitrum Network'),
                buttonOp: O(
                  style({
                    background: `transparent`, borderColor: pallete.negative,
                    backgroundImage: `linear-gradient(0deg,#500af5,#2b76e0 35%,#079dfa 77%,#02cfcf)`,
                    backgroundClip: 'text',
                  }),
                  styleInline(now({
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  })),
                )
              })({
                click: switchNetworkTether(
                  snapshot(wallet => wallet ? attemptToSwitchNetwork(wallet, CHAIN.ARBITRUM) : null, config.walletLink.wallet),
                )
              })
            }
                
            return config.$display
          }, config.walletLink.network))
        )
      }, fromPromise(wallet.metamaskQuery), config.walletLink.provider, noAccount)),
      
      switchLatest(map(empty, switchNetwork))
    ),

    {
      walletChange: multicast(walletChange)
    }
  ]
})



