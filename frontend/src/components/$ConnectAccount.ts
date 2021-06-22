import { $text, component, style, Behavior, $Node, attr } from "@aelea/core"
import { $column, layoutSheet } from "@aelea/ui-components"
import { combine, map, merge, switchLatest } from "@most/core"
import { CHAIN } from "gambit-middleware"
import { account, requestAccounts, network, getProvider } from "metamask-provider"
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
    switchLatest(
      map((provider) => {
        if (provider === null)
          return $installMetamaskWarning

        return switchLatest(
          combine((chain, account) => {
            if (account === undefined)
              return $connectButton
            if (chain !== CHAIN.BSC)
              return $alert(
                $text('Switch to BSC Network')
              )
            return config.$display
          }, network, account)
        )
      }, getProvider())
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



