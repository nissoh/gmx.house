import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, eventElementTarget, INode, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, designSheet, layoutSheet, observer, screenUtils } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { at, empty, map, merge, mergeArray, multicast, now, snapshot, switchLatest } from '@most/core'
import { Stream } from "@most/types"
import { IEthereumProvider } from "eip1193-provider"
import { groupByMap } from 'gambit-middleware'
import { initWalletLink } from "@gambitdao/wallet-link"
import { $logo } from '../common/$icons'
import * as wallet from "../common/wallets"
import { $MainMenu } from '../components/$MainMenu'
import { $ButtonPrimary } from "../components/form/$Button"
import { $anchor } from "../elements/$common"
import { $bagOfCoins, $discord, $discount, $glp, $stackedCoins, $twitter } from "../elements/$icons"
import { claimListQuery } from "../logic/claim"
import { helloBackend } from '../logic/leaderboard'


function buildThresholdList(numSteps = 20) {
  const thresholds = []

  for (let i=1.0; i<=numSteps; i++) {
    const ratio = i/numSteps
    thresholds.push(ratio)
  }

  thresholds.push(0)
  return thresholds
}


const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)


interface Website {
  baseRoute?: string
}

export default ({ baseRoute = '' }: Website) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
  [leftEyeContainerPerspective, leftEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [rightEyeContainerPerspective, rightEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [intersectionObserver, intersectionObserverTether]: Behavior<INode, IntersectionObserverEntry[]>,

  // websocket communication
  [spaceOddity, spaceOddityTether]: Behavior<string, string>,
  [walletChange, walletChangeTether]: Behavior<IEthereumProvider | null, IEthereumProvider | null>,
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)


  const rootRoute = router.create({ fragment: baseRoute, title: 'GMX Blueberry Club', fragmentsChange })
  const pagesRoute = rootRoute.create({ fragment: 'p', title: '' })


  const claimMap = replayLatest(
    map(list => groupByMap(list, item => item.account.toLowerCase()), claimListQuery())
  )

  const clientApi = helloBackend({

    spaceOddity
  })

  const walletLink = initWalletLink({
    walletProviders: [wallet.metamask, wallet.walletConnect]
  }, walletChange)


  const msgToGc = 'major tom to ground control'
  const majorTom = merge(
    now(msgToGc),
    switchLatest(map(() => at(10000, msgToGc), clientApi.spaceOddity))
  )

  
  const windowMouseMove = multicast(eventElementTarget('pointermove', window))


  const $eyeBall = $row(style({ position: 'relative', backgroundColor: 'white', placeContent: 'center', border: '6px solid black', alignItems: 'flex-end', borderRadius: '50%', width: '40px', height: '40px' }))
  const $eyeInner = $node(style({ borderRadius: '50%', width: '8px', height: '8px', display: 'block', background: 'black' }))

  const gutterSpacingStyle = style({
    ...(screenUtils.isMobileScreen ? { flexDirection: 'column', padding: '0 15px' } : { flexDirection: 'row', padding: '0 55px' }),
  })
  
  const eyeStylePosition = (eyeContainerPerspective: Stream<ResizeObserverEntry[]>) => styleInline(
    snapshot(([resizeObserverEntry], bb) => {
      const { left, top, width, height } = resizeObserverEntry.target.getBoundingClientRect()
      const x = (left) + (width / 2)
      const y = (top) + (height / 2)
      const rad = Math.atan2(x - bb.x, y - bb.y)
      const rot = (rad * (180 / Math.PI) * -1) + 180

      return {
        transform: `rotate(${rot}deg)`
      }
    }, eyeContainerPerspective, windowMouseMove)
  )
  const $card = $column(layoutSheet.spacing, style({ backgroundColor: pallete.horizon, padding: '30px', borderRadius: '20px', flex: 1 }))
  const $socialMediaLinks = $row(layoutSheet.spacingBig)(
    $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/cxjZYR4gQK' }))(
      $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
    ),
    $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
      $icon({ $content: $twitter, width: '21px', viewBox: `0 0 24 24` })
    )
  )
  return [

    mergeArray([
      switchLatest(map(() => empty(), spaceOddityTether()(majorTom))),
      $node(designSheet.main, style({ alignItems: 'center', overflowX: 'hidden',  placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh', position: 'relative', margin: '0 auto', maxWidth: '1256px' }), layoutSheet.spacingBig)(

            $row(style({ width: '100%', padding: '30px 0 0', zIndex: 1000, borderRadius: '12px' }))(
              $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
                $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '55px', viewBox: '0 0 32 32' })) })({
                  click: linkClickTether()
                }),
                $node(style({ flex: 1 }))(),
                $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, showAccount: false })({
                  routeChange: linkClickTether(),
                  walletChange: walletChangeTether()
                }),
                
                $socialMediaLinks
              ),
            ),

            $node(),
            $node(),

            $node(gutterSpacingStyle, style({ display: 'flex', gap: '36px', alignItems: 'center', placeContent: 'space-between', backgroundColor: pallete.background }))(
              $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
                $column(style({ fontSize: screenUtils.isMobileScreen ? '1.7em' : '3.1em' }))(
                  $node(
                    $text(style({}))(`Welcome to the `),
                    $text(style({ fontWeight: 'bold' }))(`GMX Bluberry Club`),
                  ),
                ),

                $text(style({ lineHeight: '1.5em' }))(`GBC is a generative 10,000 Blueberry's NFT Collection on Arbitrum dedicated to the GMX Decentralized Exchange and its amazing community. Each GBC is unique and algorithmically generated from 130+ hand drawn traits.`),

                $node(),

                $row(
                  $ButtonPrimary({ buttonOp: style({ pointerEvents: 'none' }), $content: $row(layoutSheet.spacingSmall)($text(style({ fontWeight: 'normal' }))(`We're building...`), $text(`see you soon`)) })({})
                )
              ),

              screenUtils.isDesktopScreen ? $row(
                style({ maxWidth: '460px', width: '100%', height: '460px', borderRadius: '38px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end', backgroundImage: `linear-gradient(162deg, #D0F893 21%, #5CC1D2 100%)` }),
              )(
                $element('img')(style({}), attr({ width: '300px', src: '/assets/preview-tag.svg', }))(),
                $row(style({ position: 'absolute', width: '125px', marginLeft: '58px', placeContent: 'space-between', top: '225px' }))(
                  $eyeBall(leftEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(leftEyeContainerPerspective))(
                    $eyeInner()
                  ),
                  $eyeBall(rightEyeContainerPerspectiveTether(observer.resize()), eyeStylePosition(rightEyeContainerPerspective))(
                    $eyeInner()
                  ),
                )
              ) : empty()
            ),

            $node(),

            $column(style({ alignItems: 'center' }))(
              $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

              $text(style({ fontWeight: 'bold', fontSize: '2em', margin: '10px 0px 25px' }))('GMX Blueberry Club Launch'),
              $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(
                `
The first goal of this collection is to reward GMX/GLP holders. That's why everyone with more than 1 Multiplier Point (Snapshot taken on ??/12/2021) will be able to mint 1 GBC for free. 

The second distrubtion will be a public sale which will take place on ??/12/2021.
You will be able to mint GBC for 0,03 ETH each.

After the public sale, a part of ETH will be used to create a treasury that will benefit the
GMX platform and the GBC holders. (more informations below)
                `.trim()

              ),
            ),

            $row(
              style({ position: 'relative', height: '173px', margin: '100px 0' }),
              styleInline(
                map(([intersectionObserverEntry]) => {
                  // console.log(intersectionObserverEntry.intersectionRatio)
                  const transform = `translateX(-${25 + Math.abs(intersectionObserverEntry.intersectionRatio) * 8 }vw)`
                  return { transform }
                }, intersectionObserver)
              )
            )(
              $row(intersectionObserverTether(observer.intersection({ threshold: buildThresholdList(1000) })), style({ position: 'absolute', height: 'calc(100vh)', width: '1px', right: 0, top: 0 }))(),
              $element('img')(
                style({ position: 'absolute', top: 0, left: 0, width: '2398px', height: '173px' }),
                attr({ src: `/assets/roulette-preview.png`, }),
              )(),
              $element('img')(
                style({ position: 'absolute', top: 0, left: 0, width: '2398px', height: '173px' }),
                attr({ src: `/assets/roulette-preview.png`, }),
              )()
            ),

            $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
              $text(style({ fontWeight: 'bold', fontSize: '2em' }))('How does it work ?'),
              $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('The collection is based on a treasury that grows exponentially over time'),
            ),

            $node(),

            $row(layoutSheet.spacingBig, gutterSpacingStyle)(
              $card(
                $icon({ $content: $glp, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('$GLP'),
                $column(
                  $text('The GLP consists of an index of assets used for swap and leverage transactions on the GMX platform.'),
                  $text('GLP token earn Escrowed GMX rewards and 50% of platform fees distributed in ETH.'),
                )
              ),
              $card(
                $icon({ $content: $bagOfCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Treasury'),
                $column(
                  $text('75% of the public sales will be used to create a GLP treasury which will provide benefits to GBC Holders and GMX platform. The remaining 25% will be used for marketing and for the marketplace development.'),
                )
              ),
            ),
            $row(layoutSheet.spacingBig, gutterSpacingStyle)(
              $card(
                $icon({ $content: $discount, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('Royalties'),

                $text('There is a 5% tax on all GBC transactions.'),
                $column(
                  $column(
                    $text('- 3% goes directly to the GLP treasury'),
                    $text('- 2% goes to the creator'),
                  )
                  
                )
              ),
              $card(
                $icon({ $content: $stackedCoins, width: '42px', viewBox: '0 0 32 32' }),
                $text(style({ fontWeight: 'bold', fontSize: '1.25em' }))('GBC Rewards'),
                $text('The GLPs are stacked on the GMX platform.'),
                $column(
                  $column(
                    $text('- 50% are automatically compounded every week'),
                    $text('- 50% are distributed to GBC holders every week'),
                  )
                  
                )
              )
            ),

            $node(),
            $node(),
            $node(),

            $row(
              $column(layoutSheet.spacing, style({ flex: .5 }))(
                $text(style({ fontWeight: 'bold', fontSize: '2em' }))('Frequently asked  questions'),
                $text(style({ whiteSpace: 'pre-wrap', maxWidth: '878px' }))('You can also contact us on our networks'),
                $socialMediaLinks
              ),
              $node(),
              $column(layoutSheet.spacingSmall, style({ flex: 1 }))(
                // $text(style({ fontWeight: 'bold', fontSize: '2em' }))('Frequently asked  questions'),
                // $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))('The collection is based on a treasury that grows exponentially over time'),
              ),
            ),

            $node(),
            $node(),
            $node(),

          )
        ),

        // router.contains(pagesRoute)(
        //   $column(layoutSheet.spacingBig, style({ maxWidth: '1080px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
        //     $row(layoutSheet.spacing, style({ padding: screenUtils.isDesktopScreen ? '34px 15px' : '18px 12px 0', zIndex: 30, alignItems: 'center' }))(
        //       screenUtils.isDesktopScreen
        //         ? $RouterAnchor({ $anchor: $element('a')($icon({ $content: $logo, fill: pallete.message, width: '46px', height: '46px', viewBox: '0 0 32 32' })), url: '/', route: rootRoute })({
        //           click: linkClickTether()
        //         })
        //         : empty(),
        //       screenUtils.isDesktopScreen ? $node(layoutSheet.flex)() : empty(),
        //       $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, containerOp: style({ padding: '34px, 20px' }) })({
        //         routeChange: linkClickTether(),
        //         walletChange: walletChangeTether()
        //       })
        //     ),
        //   )
        // ),
      ),

    ])
  ]
})


