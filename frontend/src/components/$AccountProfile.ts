import { component, $node, style, $text, attr, styleBehavior, INode, $element, stylePseudo, nodeEvent, $Node } from "@aelea/dom"
import { $column, $icon, $Popover, $row, $TextField, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, merge, mergeArray, never, now, snapshot, switchLatest } from "@most/core"
import { shortenAddress, getAccountExplorerUrl, CHAIN, bnToHex, BSC_WALLET, IClaim, shortPostAdress } from "gambit-middleware"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $ethScan, $twitter } from "../elements/$icons"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $Transaction } from "./$TransactionDetails"
import { $ButtonPrimary } from "./form/$Button"
import * as provider from 'metamask-provider'
import { combineArray, combineObject } from "@aelea/utils"
import { TransactionReceipt } from "@ethersproject/providers"
import { account } from "metamask-provider"
import { Behavior } from "@aelea/core"

type IMaybeClaimIdentity = Pick<IClaim, 'identity'> | null

export interface IProfile {
  address: string
  claim: IMaybeClaimIdentity

  $profileAnchor: $Node

  tempFix?: boolean
}




const $photoContainer = $element('img')(style({ display: 'block', backgroundSize: 'cover', borderRadius: '50%' }))

export const $AccountPhoto = (address: string, claim: IMaybeClaimIdentity, size = 42) => {
  const identity = claim?.identity.split(/^@/)
  const isTwitter = identity?.length === 2

  if (isTwitter) {
    const username = identity![1]

    return $photoContainer(
      style({ width: size + 'px', height: size + 'px' }),
      attr({ src: `https://unavatar.vercel.app/twitter/${username}` })
    )()
  }

  return $jazzicon(address, size)
}

export const $AccountLabel = (address: string, claim: IMaybeClaimIdentity) => {
  if (claim) {
    const identity = extractClaimIdentityName(address, claim)

    return $text(claim.identity.startsWith('@') ? '@' + identity : identity)
  }

  return $column(style({ alignItems: 'center' }))(
    $text(style({ color: pallete.foreground, fontSize: '.65em' }))(address.slice(0, 6)),
    $text(address.slice(address.length -4, address.length))
  )
}

function extractClaimIdentityName(address: string, claim: IMaybeClaimIdentity) {
  if (claim) {
    const identity = claim.identity.split(/^@/)
    const isTwitter = identity.length === 2

    return isTwitter ? identity[1] : identity[0]
  }
  
  return shortenAddress(address)
}

export const $ProfileLinks = (address: string, claim: IMaybeClaimIdentity) => {
  const name = extractClaimIdentityName(address, claim)
  const isTwitter = claim?.identity.startsWith('@')

  const $twitterAnchor = isTwitter
    ? $anchor(attr({ href: `https://twitter.com/${name}` }))(
      $icon({ $content: $twitter, width: '12px', viewBox: `0 0 24 24` })
    )
    : empty()

  return $row(layoutSheet.spacingSmall)(
    $twitterAnchor,
    $anchor(attr({ href: getAccountExplorerUrl(CHAIN.ARBITRUM, address) }))(
      $icon({ $content: $ethScan, width: '12px', viewBox: '0 0 24 24' })
    )
  )
}


const $ClaimForm = (address: string) => component((
  [display, displayTether]: Behavior<string, string>,
  [claimTx, claimTxTether]: Behavior<PointerEvent, string>,
  [walletConnectedSucceed, walletConnectedSucceedTether]: Behavior<string, string>,
  [claimSucceed, claimSucceedTether]: Behavior<TransactionReceipt, IClaim>,
) => {

  const claimBehavior = claimTxTether(
    snapshot(async (state) => {
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
      
      return txHash as string
    }, combineObject({ display, metamaskProvider: provider.metamaskProvider })),
    awaitPromises
  )

  return [
    $column(
      switchLatest(
        mergeArray([
          now(
            $column(layoutSheet.spacing, style({ width: '400px' }))(
              $text(style({ fontSize: '1.25em' }))('Claim Account'),
              $text(style({ color: pallete.foreground, fontSize: '.85em' }))(`Claiming account will make your name appear on the leaderboard`),
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
                      return providerAddress && address.toLowerCase() === providerAddress?.toLowerCase()
                        ? $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                          $column(style({ color: pallete.foreground, fontSize: '.65em' }))(
                            $text(`Sends 0(BNB) to`),
                            $text(`Gambit-Community's`)
                          ),
                          $ButtonPrimary({
                            disabled: merge(now(true), map(x => x.length === 0, display)),
                            $content: $text('Claim')
                          })({
                            click: claimBehavior
                          })
                        )
                        : $alert($text(`Connect a wallet matching this address`))
                    }, walletConnectedSucceed)
                  )
                })({
                  connectedWalletSucceed: walletConnectedSucceedTether()
                })
              ),
            ),
          ),
          map(tx => styleBehavior(now({ opacity: '1' }), $Transaction(tx)({
            txSucceeded: claimSucceedTether(
              map(async (txRecpt) => {
                const claim: IClaim = await (await fetch('/api/claim-account', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ tx: txRecpt.transactionHash })
                })).json()
                return claim
              }),
              awaitPromises
            )
          })), claimTx)
        ])
      ),
    ),
    {
      claimTx,
      display,
      claimSucceed
    }
  ]
})

export const $AccountProfile = ({ claim, address, $profileAnchor }: IProfile) => component((
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,
  [display, displayTether]: Behavior<any, string>,
  [claimedAccount, claimedAccountTether]: Behavior<IClaim, IClaim>

) => {


  const profileDisplay = mergeArray([
    now(claim),
    claimedAccount,
    map(identity => ({ ...claim, identity, address }), display),
    constant(claim, dismissPopover)
  ])


  return [
    $Popover({
      dismiss: claimedAccount,
      $$popContent: map(() => {
        return $ClaimForm(address)({
          display: displayTether(),
          claimSucceed: claimedAccountTether()
        })
      }, clickPopoverClaim),
    })(
      $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
        switchLatest(map(claimChange => {
          return mergeArray([
            $ProfileLinks(address, claimChange),
            $profileAnchor,
          ])
        }, profileDisplay)),


        switchLatest(
          combineArray((claim, account) => {
            return !account || account && account === address
              ? mergeArray([
                $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(nodeEvent('click')))(
                  $text(claim && claim.address === account ? 'Rename' : 'Claim')
                ),
                $text(style({ color: colorAlpha(pallete.foreground, .25) }))('|'),
              ])
              : empty()
          }, profileDisplay, account)
        ),
        
      )
    )({
      overlayClick: dismissPopoverTether()
    }),

    {
    }
  ]
})