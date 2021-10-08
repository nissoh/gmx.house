import { component, $node, style, $text, attr, styleBehavior, INode, $element, nodeEvent, $Node } from "@aelea/dom"
import { $Button, $column, $icon, $Popover, $row, $TextField, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, merge, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { shortenAddress, bnToHex, BSC_WALLET, IClaim } from "gambit-middleware"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $ethScan, $twitter } from "../elements/$icons"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $Transaction } from "./$TransactionDetails"
import { $ButtonPrimary } from "./form/$Button"
import { combineArray, combineObject } from "@aelea/utils"
import { TransactionReceipt } from "@ethersproject/providers"
import { Behavior, O, Op } from "@aelea/core"
import { $Link } from "./$Link"
import { account, CHAIN, getAccountExplorerUrl, provider } from "wallet-link"
import { Route } from "@aelea/router"


type IMaybeClaimIdentity = Pick<IClaim, 'identity'> | null


export interface IAccountPreview {
  address: string
  size?: string
  parentRoute?: Route
  claim?: string

}

export interface IProfile extends IAccountPreview {
  tempFix?: boolean
}


const $photoContainer = $element('img')(style({ display: 'block', backgroundSize: 'cover', borderRadius: '50%' }))

export const $AccountPhoto = (address: string, claim: IMaybeClaimIdentity, size = '42px') => {
  const identity = claim?.identity.split(/^@/)
  const isTwitter = identity?.length === 2

  if (isTwitter) {
    const username = identity![1]

    return $photoContainer(
      style({ width: size, height: size }),
      attr({ src: `https://unavatar.vercel.app/twitter/${username}` })
    )()
  }

  return $jazzicon(address, size)
}

export const $AccountLabel = (address: string, claim: IMaybeClaimIdentity, adressOp: Op<INode, INode> = O()) => {
  if (claim) {
    const identity = extractClaimIdentityName(address, claim)

    return $text(claim.identity.startsWith('@') ? '@' + identity : identity)
  }

  return $column(style({ alignItems: 'center' }))(
    $text(style({ fontSize: '.65em' }))(address.slice(0, 6)),
    $text(adressOp)(address.slice(address.length -4, address.length))
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



export const $AccountPreview = ({
  address, size = '42px', parentRoute
}: IAccountPreview) => component((
  [profileClick, profileClickTether]: Behavior<string, string>
) => {

  const $preview = $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    $AccountPhoto(address, null, size),
    $AccountLabel(address, null, parentRoute ? style({ color: pallete.primary }) : O())
  )
  return [

    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      parentRoute
        ? $Link({ route: parentRoute.create({ fragment: '2121212' }),
          $content: $preview,
          url: `/p/account/${address}`,
        })({ click: profileClickTether() })
        : $preview,
      parentRoute ? $ProfileLinks(address, null) : empty()
    ),

    { profileClick }
  ]
})

export const $ProfileClaimPreview = ({ claim, address }: IProfile) => component((
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,
  [display, displayTether]: Behavior<any, string>,
  [claimedAccount, claimedAccountTether]: Behavior<IClaim, IClaim>

) => {


  const profileDisplay = mergeArray([
    now(claim),
    claimedAccount,
    map(identity => ({ identity, address }), display),
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
        switchLatest(
          map(claimChange => {
            return $AccountPreview({
              address,
              size: '60px',
              // claim: claimChange
            })({})
          }, profileDisplay)
        ),

        // $IntermediateDisplay({
        //   $display: $Button({
        //     $content: $text('Claim')
        //   })({})
        // })({}),


        switchLatest(
          combineArray((claim, account) => {
            return !account || account && account.toLocaleLowerCase() == address.toLowerCase()
              ? mergeArray([
                $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(nodeEvent('click')))(
                  // $text(claim && claim.address === account ? 'Rename' : 'Claim')
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


const $ClaimForm = (address: string) => component((
  [display, displayTether]: Behavior<string, string>,
  [claimTx, claimTxTether]: Behavior<PointerEvent, string>,
  [walletConnectedSucceed, walletConnectedSucceedTether]: Behavior<string, string>,
  [claimSucceed, claimSucceedTether]: Behavior<TransactionReceipt, IClaim>,
) => {

  const claimBehavior = claimTxTether(
    snapshot(async (state) => {
      const metamask = state.provider.metamask
      const acct = await state.provider.signer.getAddress()

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
    }, combineObject({ display, provider })),
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