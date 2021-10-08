import { Behavior } from "@aelea/core"
import { $text, component, style, $Node, attr } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { combine, map, merge, switchLatest } from "@most/core"
import { shortenAddress } from "gambit-middleware"
import { account, requestAccounts, CHAIN, network, provider } from "wallet-link"
import { $alert, $anchor } from "../elements/$common"
import { $ButtonPrimary } from "./form/$Button"



export interface IIntermediateDisplay {
  $display: $Node
  // wallet: Stream<Wallet>
}

export const $IntermediateDisplay = (config: IIntermediateDisplay) => component((
  [connectedWalletSucceed, connectedWalletSucceedTether]: Behavior<any, string>,
) => {

  const $connectButton = $ButtonPrimary({ $content: $text('Connect Wallet'), buttonOp: style({ zoom: .75 }) })({
    click: connectedWalletSucceedTether(
      map(() => requestAccounts),
      switchLatest,
      map(list => {
        return list[0]
      })
    ) 
  })

  const $installMetamaskWarning = $alert(
    $column(layoutSheet.spacingTiny)(
      $text('No metamask detected. get it from '),
      $anchor(attr({ href: 'https://metamask.io' }))($text('https://metamask.io'))
    )
  )


  return [
    $column(
      switchLatest(
        map(prov => {
          if (prov === null)
            return $installMetamaskWarning

          return switchLatest(
            combine((chain, account) => {
              if (account === undefined)
                return $connectButton
              if (chain !== CHAIN.ARBITRUM)
                return $alert(
                  $text('Switch to Arbitrum Network')
                )
              return config.$display
            }, network, account)
          )
        }, provider)
      ),
      $text(map(shortenAddress, connectedWalletSucceed))
    ),

    {
      connectedWalletSucceed: merge(account, connectedWalletSucceed)
    }
  ]
})

// export const $AccountButton = (config: IIntermediateDisplay) => component((
//   [requestWallet, sampleRequestWallet]: Behavior<any, any>
// ) => {


//   const $installMetamaskWarning = $text('installMetamask')


//   return [
//     $IntermediateDisplay({
//       $display: $userConnectionStatus('d')
//     })({}),
//     {  }
//   ]
// })



