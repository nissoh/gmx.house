import { Behavior, replayLatest } from "@aelea/core"
import { $element, $node, $text, animationFrames, attr, component, eventElementTarget, INode, style, styleInline } from "@aelea/dom"
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
import { $discord, $twitter } from "../elements/$icons"
import { claimListQuery } from "../logic/claim"
import { helloBackend } from '../logic/leaderboard'





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
  [cardPerspective, cardPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [leftEyeContainerPerspective, leftEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,
  [rightEyeContainerPerspective, rightEyeContainerPerspectiveTether]: Behavior<INode, ResizeObserverEntry[]>,

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

  const moveState = snapshot((pointerEvent, frame) => ({ pointerEvent, frame }), windowMouseMove, animationFrames(window))


  const $eyeBall = $row(style({ position: 'relative', backgroundColor: 'white', placeContent: 'center', border: '6px solid black', alignItems: 'flex-end', borderRadius: '50%', width: '40px', height: '40px' }))
  const $eyeInner = $node(style({ borderRadius: '50%', width: '8px', height: '8px', display: 'block', background: 'black' }))
  
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
  return [

    mergeArray([
      switchLatest(map(() => empty(), spaceOddityTether()(majorTom))),
      $node(designSheet.main, style({ alignItems: 'center', placeContent: 'center' }))(
        router.match(rootRoute)(
          $column(style({ minHeight: '100vh',  position: 'relative', margin: '0 auto', maxWidth: '1256px' }), layoutSheet.spacingBig)(

            $row(style({ width: '100%', padding: '26px', zIndex: 1000, borderRadius: '12px' }))(
              $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
                $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: $logo, width: '65px', viewBox: '0 0 32 32' })) })({
                  click: linkClickTether()
                }),
                $node(style({ flex: 1 }))(),
                $MainMenu({ walletLink, claimMap, parentRoute: pagesRoute, showAccount: false })({
                  routeChange: linkClickTether(),
                  walletChange: walletChangeTether()
                }),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://discord.com/invite/cxjZYR4gQK' }))(
                  $icon({ $content: $discord, width: '22px', viewBox: `0 0 32 32` })
                ),
                $anchor(layoutSheet.displayFlex, attr({ target: '_blank' }), style({ padding: '0 4px', border: `1px solid ${pallete.message}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }), attr({ href: 'https://twitter.com/GBlueberryClub' }))(
                  $icon({ $content: $twitter, width: '21px', viewBox: `0 0 24 24` })
                ),
              ),
            ),

            $node(),

            $node(style({ display: 'flex', flexDirection: screenUtils.isMobileScreen ? 'column' : 'row', gap: '36px', alignItems: 'center', placeContent: 'space-between', padding: '0 45px', backgroundColor: pallete.background }))(
              $column(layoutSheet.spacingBig, style({ maxWidth: '620px' }))(
                $column(style({ fontSize: screenUtils.isMobileScreen ? '1.7em' : '3.1em' }))(
                  $node(
                    $text(style({  }))(`Welcome to the `),
                    $text(style({ fontWeight: 'bold' }))(`GMX Bluberry Club`),
                  ),
                ),

                $text(style({ lineHeight: '1.5em' }))(`GBC is a generative 10,000 Blueberry's NFT Collection on Arbitrum dedicated to the GMX Decentralized Exchange and its amazing community. Each GBC is unique and algorithmically generated from 130+ hand drawn traits.`),

                $node(),

                $row(
                  $ButtonPrimary({ buttonOp: style({ pointerEvents: 'none' }), $content: $row(layoutSheet.spacingSmall)($text(style({ fontWeight: 'normal' }))(`We're building...`), $text(`see you soon`)) })({})
                )
              ),

              $row(
                style({ maxWidth: '460px', width: '100%', height: '460px', borderRadius: '30px', boxShadow: 'rgb(0 0 0) 20px 18px 0px -5px', transformStyle: 'preserve-3d', perspective: '100px', position: 'relative', placeContent: 'center', alignItems: 'flex-end', backgroundImage: `linear-gradient(162deg, #D0F893 21%, #5CC1D2 100%)` }),

                cardPerspectiveTether(
                  observer.resize()
                ),

                styleInline(snapshot(([resizeObserverEntry], { pointerEvent }) => {

                  const target = resizeObserverEntry.target as HTMLElement
                  const cardRects = target.getBoundingClientRect()
                  const { width, height } = document.body.getBoundingClientRect()

                  const top = cardRects.top + cardRects.height / 2
                  const left = cardRects.left + cardRects.width / 2

                  const currentStyleArr = target.style.transform.match(/-?\d+(\.\d+)?/g)

                  const currentX = currentStyleArr ? Number(currentStyleArr[0]) : 0
                  const currentY = currentStyleArr ? Number(currentStyleArr[1]) : 0

                  const rotateY = +((left - pointerEvent.x) * 30 / width).toFixed(2)
                  const rotateX = Number(((pointerEvent.y - top) * 30 / height).toFixed(2))

                  const deltaX = (rotateX - currentX) * .04
                  const deltaY = (rotateY - currentY) * .04


                  return {
                    transform: `rotateX(${currentX + deltaX}deg) rotateY(${currentY + deltaY}deg)`
                  }
                }, cardPerspective, moveState))
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
              )
            ),

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


