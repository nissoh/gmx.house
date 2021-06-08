import { component, $node, style, $text, attr, event, styleBehavior, Behavior } from "@aelea/core"
import { $column, $icon, $row, $TextField, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, fromPromise, map, merge, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { shortenAddress, getAccountUrl, CHAIN, bnToHex, BSC_WALLET } from "gambit-middleware"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $external, $twitter } from "../elements/$icons"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $Popover2 } from "./$Popover"
import { $Transaction } from "./$TransactionDetails"
import { $ButtonPrimary } from "./form/$Button"
import * as provider from 'metamask-provider'
import { combineObject } from "@aelea/utils"
import { Claim } from "../logic/types"


type IProfileClaim = Pick<Claim, 'identity'> | null

export interface IProfile {
  address: string
  claim: IProfileClaim

  tempFix?: boolean
}




const $photoContainer = $node(style({ display: 'block', backgroundSize: 'cover', width: '42px', height: '42px', borderRadius: '50%' }))

export const $AccountPhoto = (address: string, claim: IProfileClaim, size = 42) => {
  const identity = claim?.identity.split(/^@/)
  const isTwitter = identity?.length === 2

  if (isTwitter) {
    const username = identity![1]
    const imageUrl = fromPromise(
      fetch(`https://unavatar.vercel.app/twitter/${username}`).then(async x => {
        return URL.createObjectURL(await x.blob())
      })
    )
    return $photoContainer(styleBehavior(map(url => ({ backgroundImage: `url(${url})` }), imageUrl)))()
  }

  return $jazzicon(address, size)
}

export const $AccountLabel = (address: string, claim: IProfileClaim) => {
  if (claim) {
    const identity = claim.identity.split(/^@/)
    const isTwitter = identity.length === 2

    if (isTwitter) {
      const username = identity![1]
      const $twitterAnchor = $anchor(attr({ href: `https://twitter.com/${username}` }))(
        $icon({ $content: $twitter, width: '12px', viewBox: `0 0 24 24` })
      )
      
      return $row(layoutSheet.spacingSmall)($text(username), $twitterAnchor)
    }

    return $text(identity[0])
  }

  return $text(shortenAddress(address))
}


const $ClaimForm = (address: string) => component((
  [display, displayTether]: Behavior<any, string>,
  [claimTx, claimTxTether]: Behavior<any, string>,
) => {

  const claimBehavior = claimTxTether(
    event('click'),
    snapshot(async (state, _) => {

      const metamask = state.metamaskProvider.metamask
      const acct = await state.metamaskProvider.signer.getAddress()

      const txHash: string = await metamask.request({
        method: 'eth_sendTransaction',
        params: [{
          from: acct,
          to: BSC_WALLET.Gambit_Claim,
          data: state.display,
          gas: '50000',
          gasLimitL: '5',
          value: bnToHex(0n)
        }],
      })

      const response = await fetch('/api/claim-account', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tx: txHash }) // body data type must match "Content-Type" header
      })

      
      return txHash as string
    }, combineObject({ display, metamaskProvider: provider.metamaskProvider })),
    awaitPromises
  )


  return [
    $column(layoutSheet.spacing, style({ width: '400px' }))(
      $text('Claim Account'),
      $text(style({ color: pallete.foreground, fontSize: '.75em' }))(`Claiming account will make your name appear on the leaderboard`),
      $node(),
      // chain(x => $text(String(x)), wallet),
      $TextField({
        label: 'Display',
        hint: `Label starting with "@" will result in link to a twitter profile with twitter's profile photo`,
        value: now('')
      })({
        change: displayTether()
      }),
      $node(),
      $row(style({ justifyContent: 'center' }), layoutSheet.spacing)(
        $IntermediateDisplay({
          $display: switchLatest(
            map(providerAddress => {
              return address === providerAddress ? $ButtonPrimary({
                disabled: merge(now(true), map(x => x.length === 0, display)),
                $content: $text(claimBehavior)('Claim')
              })({}) : $alert($text(`Connect a wallet matching this address`))
            }, provider.account)
          )
        })({  })
      ),
    ),

    {
      claimTx,
      display
    }
  ]
})

export const $AccountProfile = ({ claim, address, tempFix = false }: IProfile) => component((
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [claimSucceed, claimSucceedTether]: Behavior<any, string>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,
  [claimTx, claimTxTether]: Behavior<any, string>,
  [display, displayTether]: Behavior<any, string>,

) => {

  const accountWithDisplayReplaced = mergeArray([
    now(claim),
    map(identity => ({ ...claim, identity, address }), display),
    constant(claim, dismissPopover)
  ])

  return [
    $Popover2({
      $$popContent: map(() => {
        return $column(
          switchLatest(
            mergeArray([
              now(
                $ClaimForm(address)({
                  claimTx: claimTxTether(),
                  display: displayTether()
                }),
              ),
              map(tx => styleBehavior(now({ opacity: '1' }), $Transaction(tx)({
                txSucceeded: claimSucceedTether()
              })), claimTx)
            ])
          ),
        )
      }, clickPopoverClaim),
    })(
      $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
        $anchor(attr({ href: tempFix ? '' : `/p/account/${address}` }), layoutSheet.row, layoutSheet.spacing, style({ alignItems: 'center' }))(
          switchLatest(map(claimChange => $AccountPhoto(address, claimChange), accountWithDisplayReplaced)),
          switchLatest(map(claimChange => $AccountLabel(address, claimChange), accountWithDisplayReplaced)),
        ),
        $anchor(attr({ href: getAccountUrl(CHAIN.BSC, address) }))(
          $icon({ $content: $external, width: '12px', viewBox: '0 0 24 24' })
        ),
        $text(style({ color: colorAlpha(pallete.foreground, .25) }))('|'),
        $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(event('click')))(
          $text('Claim')
        ),  
      )
    )({
      overlayClick: dismissPopoverTether()
    }),

    {
      claimSucceed
    }
  ]
})