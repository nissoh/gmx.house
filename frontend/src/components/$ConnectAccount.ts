import { $text, component, style, Behavior, $Node, attr } from "@aelea/core"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { Wallet } from "@ethersproject/wallet"
import { combine, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "gambit-middleware"
import { account, metamaskProvider, requestAccounts, network, InitMetamaskProvider, getProvider } from "metamask-provider"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $alertIcon } from "../elements/$icons"
import { $ButtonPrimary } from "./form/$Button"



const $userConnectionStatus = (address: string) => $row(style({ backgroundColor: pallete.foreground, borderRadius: '12px', alignItems: 'center', overflow: 'hidden' }))(
  $row(style({ borderRadius: '12px', alignItems: 'center', padding: '0 10px' }))(
    $text(address.slice(0, 6) + '...' + address.slice(-4))
  ),
  $row(style({ backgroundColor: pallete.foreground, height: '40px', alignItems: 'center', padding: '0 6px' }))(
    $jazzicon(address)
  )
)


export interface IIntermediateDisplay {
  $display: $Node
  // wallet: Stream<Wallet>
}

export const $IntermediateDisplay = (config: IIntermediateDisplay) => component((
  [requestWallet, sampleRequestWallet]: Behavior<any, any>
) => {

  const $connectButton = $ButtonPrimary({ $content: $text('Connect Wallet'), buttonOp: style({ zoom: .75 }) })({
    click: sampleRequestWallet(
      map(() => requestAccounts),
      switchLatest
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
            if (chain !== CHAIN.BSC && chain !== CHAIN.ETH_ROPSTEN)
              return $alert(
                $text('Switch to BSC Network')
              )
            return config.$display
          }, network, account)
        )
      }, getProvider())
    ),
    { requestWallet }
  ]
})

export const $AccountButton = (config: IIntermediateDisplay) => component((
  [requestWallet, sampleRequestWallet]: Behavior<any, any>
) => {


  const $installMetamaskWarning = $text('installMetamask')


  return [
    $IntermediateDisplay({
      $display: $userConnectionStatus('d')
    })({}),
    {  }
  ]
})



