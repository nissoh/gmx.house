import { $text, component, style, Behavior } from "@aelea/core"
import { $row } from "@aelea/ui-components"
import { pallete, theme } from "@aelea/ui-components-theme"
import { combine, map, switchLatest } from "@most/core"
import { network, account, requestAccounts } from "../api/account"
import { awaitProvider } from "../api/provider"
import { $jazzicon } from "../common/gAvatar"
import { $ButtonPrimary } from "./$Button"



const $userConnectionStatus = (address: string) => $row(style({ backgroundColor: pallete.foreground, borderRadius: '12px', alignItems: 'center', overflow: 'hidden' }))(
  $row(style({ borderRadius: '12px', alignItems: 'center', padding: '0 10px' }))(
    $text(address.slice(0, 6) + '...' + address.slice(-4))
  ),
  $row(style({ backgroundColor: pallete.foreground, height: '40px', alignItems: 'center', padding: '0 6px' }))(
    $jazzicon(address)
  )
)

export const $AccountButton = () => component((
  [requestWallet, sampleRequestWallet]: Behavior<any, any>
) => {

  const $connectButton = style({ zoom: .75 }, $ButtonPrimary({ $content: $text('Engage wallet') })({
    click: sampleRequestWallet(
      map(() => {
        return requestAccounts
      }),
      switchLatest
    ) 
  }))

  const $installMetamaskWarning = $text('installMetamask')


  return [
    switchLatest(
      map(provider => {

        if (provider === null)
          return $installMetamaskWarning

        return switchLatest(
          combine((chain, account) => {
            if (account === undefined)
              return $connectButton

            if (chain.chainId !== 3)
              return $text(style({ color: pallete.negative }))('Please switch to Ropsten Network')

            return $userConnectionStatus(account)
          }, network, account)
        )


      }, awaitProvider)
    ),
    { requestWallet }
  ]
})


