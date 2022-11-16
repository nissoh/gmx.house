import { Behavior, combineArray, combineObject, O, Op } from "@aelea/core"
import { $element, $node, $text, attr, component, INode, nodeEvent, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $Popover, $row, $TextField, http, layoutSheet, state } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { BaseProvider } from "@ethersproject/providers"
import { Stream } from "@most/types"
import { CHAIN, IClaim, IClaimSource, intervalInMsMap, parseTwitterClaim, validateIdentityName, getAccountExplorerUrl } from "@gambitdao/gmx-middleware"
import { IWalletLink } from "@gambitdao/wallet-link"
import { $alert, $anchor, $labeledDivider } from "../elements/$common"
import { $ethScan, $twitter } from "../elements/$icons"
import { $Link } from "./$Link"
import { isAddress } from "@ethersproject/address"
import { $jazzicon } from "../common/avatar"
import { awaitPromises, constant, empty, fromPromise, map, merge, mergeArray, now, snapshot, switchLatest } from "@most/core"
import { IEthereumProvider } from "eip1193-provider"
import { $ButtonPrimary, $ButtonSecondary } from "./form/$Button"
import { $IntermediateConnect } from "./$ConnectAccount"
import { getGatewayUrl, getIdentityFromENS, IEnsClaim } from "common"


export interface IAccountPreview {
  address: string
  labelSize?: string
  avatarSize?: string
  parentRoute?: Route
  chain: CHAIN
  claim?: IClaim
}

export interface IAccountClaim extends IAccountPreview {
  walletLink: IWalletLink
}

export interface IProfile extends IAccountClaim {
  tempFix?: boolean
  claimMap: Stream<{ [k: string]: IClaim }>

  walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">
}


const $photoContainer = $element('img')(style({ display: 'block', backgroundColor: pallete.background, position: 'relative', backgroundSize: 'cover', borderRadius: '50%', overflow: 'hidden' }))

export const $AccountPhoto = (address: string | null, claim?: IClaim, size = '42px') => {
  const claimType = claim?.sourceType

  if (claimType) {
    const isTwitter = claimType === IClaimSource.TWITTER

    if (isTwitter) {
      return $photoContainer(
        style({ width: size, height: size, minWidth: size }),
        attr({ src: `https://unavatar.vercel.app/twitter/${claim.name}` })
      )()
    } else {
      const data: IEnsClaim = claim.data ? JSON.parse(claim.data) : {}
      const imageUrl = data.imageUrl

      if (imageUrl) {
        return $photoContainer(attr({ src: getGatewayUrl(imageUrl) }), style({ minWidth: size, height: size }))()
      }     
    }

  }

  return $jazzicon(address, size)
}

export const $disconnectedWalletDisplay = (avatarSize = 38) => {
  const sizePx = avatarSize + 'px'
  const $wrapper = $node(style({ width: sizePx, height: sizePx, minWidth: sizePx, minHeight: sizePx, borderRadius: '50%' }))

  return $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', textDecoration: 'none' }))(
    $wrapper(style({ display: 'flex', border: `1px solid ${pallete.foreground}`, placeContent: 'center', alignItems: 'center' }))(
      $text(style({ fontWeight: 800, color: pallete.foreground }))('?')
    ),
    $column(style({ whiteSpace: 'nowrap' }))(
      $text(style({ fontSize: '.75em' }))('0x----'),
      $text(style({ fontSize: '1em' }))('----')
    )
  )
}

export const $AccountLabel = (address: string, claim?: IClaim, adressOp: Op<INode, INode> = O()) => {
  
  if (claim) {
    return $text(style({ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }), adressOp)(claim.name)
  }

  return $column(
    $text(style({ fontSize: '.75em' }))(address.slice(0, 6)),
    $text(adressOp, style({ fontSize: '1em' }))(address.slice(address.length -4, address.length))
  )
}


export const $ProfileLinks = (address: string, chain: CHAIN, claim?: IClaim) => {
  const $explorer = $anchor(attr({ href: getAccountExplorerUrl(chain, address) }))(
    $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
  )

  const twitterHandle = claim?.sourceType === IClaimSource.TWITTER
    ? claim.name
    : claim?.sourceType === IClaimSource.ENS
      ? JSON.parse(claim.data).twitterUrl : null

  if (twitterHandle) {
    return $row(layoutSheet.spacing)(
      $explorer,
      $anchor(attr({ href: `https://twitter.com/${twitterHandle}` }))(
        $icon({ $content: $twitter, width: '16px', viewBox: `0 0 24 24` })
      ),
    )
  }


  return $explorer
}



export const $AccountPreview = ({
  address, parentRoute, claim, chain,
  labelSize = '16px', avatarSize = '38px',
}: IAccountPreview) => component((
  [profileClick, profileClickTether]: Behavior<string, string>
) => {
  const $preview = $row(layoutSheet.row, layoutSheet.spacingSmall, style({ alignItems: 'center', pointerEvents: 'none', textDecoration: 'none' }))(
    $AccountPhoto(address, claim, avatarSize),
    $AccountLabel(address, claim, parentRoute ? style({ color: pallete.primary, fontSize: labelSize }) : style({ fontSize: labelSize }))
  )
  return [

    $row(layoutSheet.spacingSmall, style({ alignItems: 'center', minWidth: 0 }))(
      parentRoute
        ? $Link({ route: parentRoute.create({ fragment: '2121212' }),
          $content: $preview,
          anchorOp: style({ minWidth: 0, overflow: 'hidden' }),
          url: `/${chain === CHAIN.ARBITRUM ? 'arbitrum' : 'avalanche'}/account/${address}`,
        })({ click: profileClickTether() })
        : $preview,
      // parentRoute ? $ProfileLinks(address) : empty()
    ),

    { profileClick }
  ]
})



export const $ProfilePreviewClaim = ({ address, avatarSize, labelSize, claimMap, walletLink, walletStore, chain }: IProfile) => component((
  [clickPopoverClaim, clickPopoverClaimTether]: Behavior<any, any>,
  [dismissPopover, dismissPopoverTether]: Behavior<any, any>,
  [display, displayTether]: Behavior<any, string>,
  [claimedAccount, claimedAccountTether]: Behavior<IClaim, IClaim>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,

) => {


  const claimFromMap = map(map => map[address.toLocaleLowerCase()], claimMap)
  const claimChange: Stream<IClaim | undefined> = mergeArray([
    claimFromMap,
    claimedAccount,
    map(identity => {
      if (identity) {
        try {
          return parseTwitterClaim(address, identity)
        } catch {
          return undefined
        }
      }

    }, display),
    switchLatest(constant(claimFromMap, dismissPopover))
  ])

  
  return [

    $column(layoutSheet.spacing)(
      $Popover({
        dismiss: claimedAccount,
        $$popContent: map((address) => {
          return $ClaimForm(address, walletLink, walletStore, claimFromMap)({
            display: displayTether(),
            claimSucceed: claimedAccountTether(),
            walletChange: walletChangeTether()
          })
        }, clickPopoverClaim),
      })(
        $column(
          switchLatest(
            map(claimChange => {
              return $row(layoutSheet.row, layoutSheet.spacing, style({ alignItems: 'center', textDecoration: 'none' }))(
                $AccountPhoto(address, claimChange, avatarSize),

                $AccountLabel(address, claimChange, style({ fontSize: labelSize, lineHeight: 1 })),
                $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $ProfileLinks(address, chain, claimChange),
                  switchLatest(
                    map((claimerAddress) => {
                      const showActions = !claimerAddress || claimerAddress && claimerAddress.toLocaleLowerCase() == address.toLowerCase()
                      return showActions
                        ? $anchor(style({  }), clickPopoverClaimTether(nodeEvent('click'), constant(claimerAddress)))(
                          $ButtonSecondary({
                            $content: claimChange ? $text('Update') : $text('Claim account'),
                          })({})
                        )
                        : empty()
                    }, walletLink.account)
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
      walletChange
    }
  ]
})


enum ClaimStatus {
  STORING,
  FAILED,
  SUCCESS
}

const $ClaimForm = (address: string, walletLink: IWalletLink, walletStore: state.BrowserStore<"metamask" | "walletConnect" | null, "walletStore">, claim: Stream<IClaim | undefined>) => component((
  [display, displayTether]: Behavior<string, string>,
  [claimTx, claimTxTether]: Behavior<PointerEvent, any>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider, IEthereumProvider>,
  [claimSucceed, claimSucceedTether]: Behavior<Promise<IClaim>, IClaim>,
) => {


  return [
    $column(
      switchLatest(
        mergeArray([
          now(
            $IntermediateConnect({
              $display: switchLatest(
                combineArray((claim, provider) => {

                  if (!provider) {
                    return empty()
                  }

                  const isNotMatchedAccount = map(walletAddress => {
                    return address !== walletAddress
                  }, walletLink.account)

                  const claimFlowOp = O(
                    claimSucceedTether(
                      awaitPromises
                    ),
                    map(query => {
                      const postQuery = query
                        .then(res => ClaimStatus.SUCCESS)
                        .catch(() => ClaimStatus.FAILED)
                              

                      return merge(
                        fromPromise(postQuery),
                        now(ClaimStatus.STORING)
                      )
                    }),
                    switchLatest
                  )

                  return $column(layoutSheet.spacing, style({ width: '400px', fontSize: '.85em' }))(
                    ...(claim ? [] : [
                      $text(`Claiming account will make your name appear on the leaderboard`),
                      $node(),
                    ]),

                    switchLatest(map(notMatched => {
                      if (notMatched) {
                        return $alert($text('Connect a wallet matching this address'))
                      }

                      return empty()
                    }, isNotMatchedAccount)),


                    // $text(style({ fontSize: '1.25em' }))('Claim Account'),
                    $node(),
                    // chain(x => $text(String(x)), wallet),
                    $TextField({
                      label: '@Handle',
                      hint: `Assign twitter account using twitter handle name`,
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
                      $ButtonPrimary({
                        disabled: combineArray(
                          (match, valid) => {
                            return match || valid
                          },
                          isNotMatchedAccount,
                          mergeArray([
                            now(true),
                            map(name => {
                              try {
                                validateIdentityName(name)
                                return false
                              } catch (e) {
                                return true
                              }
                            }, display)
                          ])
                        ),
                        $content: $text('Use Twitter')
                      })({
                        click: claimTxTether(
                          snapshot(async state => {

                            const signer = provider.getSigner()
                            const signature = await signer.signMessage(state.display)

                            return http.fetchJson<IClaim>('/api/claim-account-twitter', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ display: state.display, account: address, signature })
                            })
                          }, combineObject({ display })),
                          claimFlowOp
                        )
                      })
                    ),

                    $labeledDivider('or'),


                    // https://medium.com/the-ethereum-name-service/step-by-step-guide-to-setting-an-nft-as-your-ens-profile-avatar-3562d39567fc
                    $text(style({ color: pallete.foreground }))(`link Ethereum Name Service(ENS) and fetch(twitter and NFT profile photo) metadata if assigned`),
                    $anchor(attr({ href: 'https://medium.com/the-ethereum-name-service/step-by-step-guide-to-setting-an-nft-as-your-ens-profile-avatar-3562d39567fc' }))(
                      $text('Guide on setting ENS profile avatar')
                    ),
                    // switchLatest(map(ensName => ensName ? empty() : $alert($text(`No ENS has been assigned. visit https://app.ens.domains/`)), ensNameQuery)),
                    $row(style({ justifyContent: 'center' }))(
                      $ButtonPrimary({
                        $content: $text(`Use ENS`),
                        disabled: isNotMatchedAccount
                      })({
                        click: claimTxTether(
                          map(async () => {

                            // const mainnetProvider = getDefaultProvider()
                            const signer = provider.getSigner()
                            const signature = await signer.signMessage(address)

                            return http.fetchJson<IClaim>('/api/claim-account-ens', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ account: address, signature })
                            })
                          }),
                          claimFlowOp
                        )
                      }),
                    ),


                  )
                }, claim, walletLink.provider)
              ),
              walletLink,
              walletStore
            })({
              walletChange: walletChangeTether()
            }),
          ),
          map(claimState => {
            const message = claimState === ClaimStatus.STORING ? 'Setting up...' : claimState === ClaimStatus.SUCCESS ? 'Done' : 'Failed'
            return $text(message)
          }, claimTx)
        ])
      ),
    ),
    {
      claimTx,
      display,
      claimSucceed,
      walletChange
    }
  ]
})



const CACHE_TTL = intervalInMsMap.DAY7


type ICachedId = IEnsClaim & { createdAt: number }
export async function getCachedMetadata (address: string, provider: BaseProvider) {
  const normalizedAddress = address.toLowerCase()

  const cachedItem = window.localStorage.getItem(`ens-${normalizedAddress}`)
  const item: ICachedId = cachedItem && JSON.parse(cachedItem)

  if (!item || item.createdAt > Date.now() + CACHE_TTL) {
    const ensName = await getIdentityFromENS(address, provider)

    if (ensName?.ensName) {
      const data: ICachedId = { createdAt: Date.now(), ...ensName }
      window.localStorage.setItem(`ens-${normalizedAddress}`, JSON.stringify(data))
    }

    return null
  }

  return item
}



