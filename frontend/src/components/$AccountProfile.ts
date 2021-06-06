import { component, $node, style, $text, attr, event, styleBehavior, Behavior } from "@aelea/core"
import { $column, $icon, $row, $TextField, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, chain, constant, fromPromise, map, merge, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { shortenAddress, getAccountUrl, CHAIN, bnToHex, BSC_WALLET } from "gambit-middleware"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $external, $twitter } from "../elements/$icons"
import { Account, Claim } from "../logic/leaderboard"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $Popover2 } from "./$Popover"
import { $Transaction } from "./$TransactionDetails"
import { $ButtonPrimary } from "./form/$Button"
import * as provider from 'metamask-provider'
import { combineObject } from "@aelea/utils"


export interface IProfile {
  account: Account
}




const $photoContainer = $node(style({ display: 'block', backgroundSize: 'cover', width: '42px', height: '42px', borderRadius: '50%' }))

export const $AccountPhoto = (account: Account) => {
  const identity = account?.claim?.identity.split(/^@/)
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

  '@nissanation'.split(/^@/)


  return $jazzicon(account.address, 42)
}

export const $AccountLabel = (account: Account) => {

  if (account.claim) {
    const identity = account.claim.identity.split(/^@/)
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

  return $text(shortenAddress(account.address))
}


export const $AccountProfile = ({ account }: IProfile) => component((
  [claim, claimTether]: Behavior<any, string>,
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [display, displayTether]: Behavior<any, string>,
  [connected, connectedTether]: Behavior<any, string>,
  [claimSucceed, claimSucceedTether]: Behavior<any, string>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,

) => {



  const claimBehavior = claimTether(
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

  const accountWithDisplayReplaced = mergeArray([
    now(account),
    map(identity => {
      const claim = identity ? { identity } as Claim : account.claim
      return { ...account, claim }
    }, display),
    constant(account, dismissPopover)
  ])

  return [
    $Popover2({
      $$popContent: map(() => {
        return $column(
          switchLatest(
            mergeArray([
              now(
                $column(layoutSheet.spacing, style({ width: '400px' }))(
                  $text('Claim Account'),
                  $text(style({ color: pallete.foreground, fontSize: '.75em' }))(`Claiming account will make your name appear on the leaderboard`),
                  $node(),
                  chain(x => $text(String(x)), connected),
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
                        map(address => {
                          return account.address === address ? $ButtonPrimary({
                            disabled: merge(now(true), map(x => x.length === 0, display)),
                            $content: $text(claimBehavior)('Claim')
                          })({}) : $alert($text(`Connect a wallet matching this address`))
                        }, provider.account)
                      )
                          
                    })({ requestWallet: connectedTether() })
                  ),
                ),
              ),
              map(tx => styleBehavior(now({ opacity: '1' }), $Transaction(tx)({
                txSucceeded: claimSucceedTether()
              })), claim)
            ])
          ),
        )
      }, clickPopoverClaim),
    })(
      $row(layoutSheet.spacing)(
        switchLatest(map(acct => $AccountPhoto(acct), accountWithDisplayReplaced)),
        $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
          switchLatest(map(acct => $AccountLabel(acct), accountWithDisplayReplaced)),
          $anchor(attr({ href: getAccountUrl(CHAIN.BSC, account.address) }))(
            $icon({ $content: $external, width: '12px', viewBox: '0 0 24 24' })
          ),
          $text(style({ color: pallete.horizon }))('|'),
          $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(event('click')))(
            $text('Claim')
          ),   

        )
      )
    )({
      overlayClick: dismissPopoverTether()
    }),

    {
      claimSucceed
    }
  ]
})