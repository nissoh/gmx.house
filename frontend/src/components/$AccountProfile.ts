import { component, $node, style, $text, attr, INode, $element, nodeEvent } from "@aelea/dom"
import { $column, $icon, $Popover, $row, $seperator, $TextField, http, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, map, merge, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { IClaim, IClaimSource, parseClaim, validateIdentityName } from "gambit-middleware"
import { $jazzicon } from "../common/gAvatar"
import { $alert, $anchor } from "../elements/$common"
import { $ethScan, $twitter } from "../elements/$icons"
import { $IntermediateDisplay } from "./$ConnectAccount"
import { $ButtonPrimary } from "./form/$Button"
import { combineObject } from "@aelea/utils"
import { Behavior, O, Op } from "@aelea/core"
import { $Link } from "./$Link"
import * as wallet from "wallet-link"
import { Route } from "@aelea/router"
import { Stream } from "@most/types"
import { getAccountExplorerUrl, IWalletLink } from "wallet-link"
import { Web3Provider } from "@ethersproject/providers"
import { IEthereumProvider } from "eip1193-provider"


export interface IAccountPreview {
  address: string
  labelSize?: string
  avatarSize?: string
  parentRoute?: Route
  claim?: IClaim
}

export interface IAccountClaim extends IAccountPreview {
  walletLink: Stream<IWalletLink | null>
}

export interface IProfile extends IAccountClaim {
  tempFix?: boolean
  claimMap: Stream<Map<string, IClaim>>
}


const $photoContainer = $element('img')(style({ display: 'block', backgroundSize: 'cover', borderRadius: '50%' }))

export const $AccountPhoto = (address: string, claim?: IClaim, size = '42px') => {
  const isTwitter = claim?.sourceType === IClaimSource.TWITTER

  if (isTwitter) {
    return $photoContainer(
      style({ width: size, height: size }),
      attr({ src: `https://unavatar.vercel.app/twitter/${claim.name}` })
    )()
  }

  return $jazzicon(address, size)
}

export const $AccountLabel = (address: string, claim?: IClaim, adressOp: Op<INode, INode> = O()) => {
  if (claim) {
    return $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }), adressOp)(claim.name)
  }

  return $column(
    $text(style({ fontSize: '.65em' }))(address.slice(0, 6)),
    $text(adressOp)(address.slice(address.length -4, address.length))
  )
}


export const $ProfileLinks = (address: string, claim?: IClaim) => {
  const isTwitter = claim?.sourceType === IClaimSource.TWITTER

  const $twitterAnchor = isTwitter
    ? $anchor(attr({ href: `https://twitter.com/${claim?.name}` }))(
      $icon({ $content: $twitter, width: '16px', viewBox: `0 0 24 24` })
    )
    : empty()

  return $row(layoutSheet.spacingSmall)(
    $anchor(attr({ href: getAccountExplorerUrl(wallet.CHAIN.ARBITRUM, address) }))(
      $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
    ),
    $twitterAnchor,
  )
}



export const $AccountPreview = ({
  address, labelSize = '16px', avatarSize = '38px',
  parentRoute, claim,

}: IAccountPreview) => component((
  [profileClick, profileClickTether]: Behavior<string, string>
) => {

  const $preview = $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    $AccountPhoto(address, claim, avatarSize),
    $AccountLabel(address, claim, parentRoute ? style({ color: pallete.primary, fontSize: labelSize }) : style({ fontSize: labelSize }))
  )
  return [

    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      parentRoute
        ? $Link({ route: parentRoute.create({ fragment: '2121212' }),
          $content: $preview,
          anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
          url: `/p/account/${address}`,
        })({ click: profileClickTether() })
        : $preview,
      // parentRoute ? $ProfileLinks(address) : empty()
    ),

    { profileClick }
  ]
})



export const $ProfilePreviewClaim = ({ address, avatarSize, labelSize, claimMap, walletLink }: IProfile) => component((
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,
  [display, displayTether]: Behavior<any, string>,
  [claimedAccount, claimedAccountTether]: Behavior<IClaim, IClaim>

) => {


  const claimFromMap = map(map => map.get(address.toLocaleLowerCase()), claimMap)
  const claimChange: Stream<IClaim | undefined> = mergeArray([
    claimFromMap,
    claimedAccount,
    map(identity => {
      if (identity) {
        try {
          return parseClaim(address, identity)
        } catch {
          return undefined
        }
      }

    }, display),
    switchLatest(constant(claimFromMap, dismissPopover))
  ])

  const claimer = switchLatest(map(wallet => wallet ? wallet.account : now(null), walletLink))


  return [

    $column(layoutSheet.spacing)(
      $Popover({
        dismiss: claimedAccount,
        $$popContent: map((address) => {
          return $ClaimForm(address, walletLink)({
            display: displayTether(),
            claimSucceed: claimedAccountTether()
          })
        }, clickPopoverClaim),
      })(
        $column(
          switchLatest(
            map(claimChange => {
              return $row(layoutSheet.row, layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
                $AccountPhoto(address, claimChange, avatarSize),

                $column(layoutSheet.spacingSmall)(
                  $AccountLabel(address, claimChange, style({ fontSize: labelSize })),
                  $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                    $ProfileLinks(address, claimChange),
                    switchLatest(
                      map((claimerAddress) => {
                        return !claimerAddress || claimerAddress && claimerAddress.toLocaleLowerCase() == address.toLowerCase()
                          ? $anchor(style({ fontSize: '.7em' }), clickPopoverClaimTether(nodeEvent('click'), constant(claimerAddress)))(
                            $text(claimChange ? 'Rename' : 'Claim')
                          )
                          : empty()
                      }, claimer)
                    )
                  )
                )
              )
            }, claimChange)
          ),
        )
      )({
        overlayClick: dismissPopoverTether()
      }),

    ),

    {
    }
  ]
})


enum ClaimStatus {
  STORING,
  FAILED,
  SUCCESS
}

const $ClaimForm = (address: string, walletLink: Stream<IWalletLink | null>) => component((
  [display, displayTether]: Behavior<string, string>,
  [claimTx, claimTxTether]: Behavior<PointerEvent, ClaimStatus>,
  [walletConnectedSucceed, walletConnectedSucceedTether]: Behavior<IEthereumProvider, IEthereumProvider>,
  [claimSucceed, claimSucceedTether]: Behavior<Promise<IClaim>, IClaim>,
) => {


  const provider: Stream<Web3Provider | null> = switchLatest(map(wal => wal ? wal.provider : now(null), walletLink))


  return [
    $column(
      switchLatest(
        mergeArray([
          now(
            $column(layoutSheet.spacing, style({ width: '400px' }))(
              // $text(style({ fontSize: '1.25em' }))('Claim Account'),
              $text(style({ color: pallete.foreground, fontSize: '.85em' }))(`Claiming account will make your name appear on the leaderboard`),
              $node(),
              // chain(x => $text(String(x)), wallet),
              $TextField({
                label: 'Display',
                hint: `"@" will link to a twitter profile`,
                value: now(''),
                validation: map(str => {
                  try {
                    validateIdentityName(String(str))
                  } catch (err) {
                    return (err as Error).message
                  }
                  return null
                })
              })({
                change: displayTether()
              }),
              $node(),
              $row(style({ justifyContent: 'center' }), layoutSheet.spacing)(
                $IntermediateDisplay({
                  $display: switchLatest(
                    map(wallet => {

                      return $ButtonPrimary({
                        disabled: merge(
                          merge(now(true), map(name => {
                            try {
                              validateIdentityName(name)
                              return false
                            } catch (e) {
                              return true
                            }
                          }, display)),
                          map(walletAddress => {
                            if (address !== walletAddress) {
                              return 'Connect a wallet matching this address'
                            }

                            return false
                          }, wallet!.account)
                        ),
                        $content: $text('Sign')
                      })({
                        click: claimTxTether(
                          snapshot(async state => {
                            if (!state.provider) {
                              throw new Error('no wallet provider found')
                            }

                            const signer = state.provider.getSigner()
                            const account = await signer.getAddress()
                            const signature = await signer.signMessage(state.display)

                            return http.fetchJson<IClaim>('/api/claim-account', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ display: state.display, account, signature })
                            })
                          }, combineObject({ display, provider })),
                          claimSucceedTether(
                            awaitPromises
                          ),
                          map(query => {
                            const postQuery = query
                              .catch(() => ClaimStatus.FAILED)
                              .then(res => ClaimStatus.SUCCESS)

                            return merge(
                              fromPromise(postQuery),
                              now(ClaimStatus.STORING)
                            )
                          }),
                          switchLatest
                        )
                      })
                      

                      // return wallet && address.toLowerCase() === wallet?.toLowerCase()
                      //   ? $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                      //     // $column(style({ color: pallete.foreground, fontSize: '.65em' }))(
                      //     //   $text(`You can always change`),
                      //     //   $text(`or remove later`)
                      //     // ),
                          
                      //   )
                      //   : $alert($text(`Connect a wallet matching this address`))
                    }, walletLink)
                  ),
                  walletLink
                })({
                  walletChange: walletConnectedSucceedTether()
                })
              ),
            ),
          ),
          map(claimState => {
            const message = claimState === ClaimStatus.STORING ? 'Storing...' : claimState === ClaimStatus.SUCCESS ? 'Done' : 'Failed'
            return $text(message)
          }, claimTx)
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