import { O, Op } from "@aelea/core"
import { $text, style, attr, $node, $element, $Branch } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row, layoutSheet, $column, $icon, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, periodic } from "@most/core"
import { formatFixed, unixTimestampNow, USD_DECIMALS } from "@gambitdao/gmx-middleware"
import { $AnchorLink } from "../../components/$Link"
import { $anchor } from "../../elements/$common"
import { $ProfitLossText } from "../common"
import { $Tooltip } from "../../components/$Tooltip"
import { $alertIcon } from "../../elements/$icons"

const defaultNumberFormatOption: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
}

export function formatReadableUSD(ammount: bigint, options?: Intl.NumberFormatOptions) {
  if (ammount === 0n) {
    return '$0'
  }

  const amountUsd = formatFixed(ammount, USD_DECIMALS)
  const opts = options
    ? { ...defaultNumberFormatOption, ...options }
    : Math.abs(amountUsd) > 100 ? defaultNumberFormatOption : { ...defaultNumberFormatOption, maximumFractionDigits: 1 }

  return new Intl.NumberFormat("en-US", opts).format(amountUsd)
}

export const $alertTooltip = ($content: $Branch) => {
  return $Tooltip({
    $content,
    $anchor: $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', fill: pallete.indeterminate, svgOps: style({ minWidth: '18px' }) }),
  })({})
}

function countdownFn(targetDate: number, now: number) {
  const distance = targetDate - now

  const days = Math.floor(distance / (60 * 60 * 24))
  const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((distance % (60 * 60)) / 60)
  const seconds = Math.floor(distance % 60)

  return `${days ? days + "d " : ''} ${hours ? hours + "h " : ''} ${minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : '0s'}`
}

const everySec = map(unixTimestampNow, periodic(1000))

export const countdown = (targetDate: number) => {
  return map(now => countdownFn(targetDate, now), everySec)
}

export function $CompeititonInfo(from: number, to: number, parentRoute: Route, routeChangeTether: () => Op<string, string>) {

  const $details = (start: number, end: number) => {
    const now = unixTimestampNow()
    const ended = end < now

    return $column(layoutSheet.spacing)(
      $column(screenUtils.isDesktopScreen ? layoutSheet.spacingBig : layoutSheet.spacing, style({ flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', fontSize: '1.15em', alignItems: 'center', placeContent: 'center' }))(
        $row(layoutSheet.spacing)(
          $column(style({ textAlign: 'right' }))(
            $anchor(attr({ href: 'https://blueberry.club/p/leaderboard' }))(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({ fontSize: '1.65em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${colorAlpha(pallete.primary, .45)}, 1px 1px 50px ${colorAlpha(pallete.primary, .25)} ` }))('#TopBlueberry'),
              )
            ),
          ),
        ),
        ended
          ? $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            // $addToCalendar({
            //   // time: start,
            //   time: new Date(Date.UTC(new Date().getFullYear(), 1, 1, 16)),
            //   title: 'Blueberry Trading Compeition',
            //   description: `Monthly trading competitions will be held. These tournaments will offer cash prizes, unique lab items, and more as rewards for traders who compete and win.  \n\n${document.location.href}`
            // }),
            $column(
              $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
                $text(style({}))('Next Cycle!'),
                $text(style({ color: pallete.foreground }))('Starting in')
              ),
              $text(style({}))(countdown(Date.UTC(new Date().getFullYear(), 1, 1, 16) / 1000))
            )
          )
          : $column(
            $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
              $text(style({ color: pallete.indeterminate }))('Beta LIVE!'),
              $text(style({ color: pallete.foreground }))('Ending in')
            ),
            $text(style({}))(countdown(end))
          )
      ),

      // $anchor(style({ fontSize: '.65em', placeSelf: 'center' }), attr({ href: 'https://medium.com/@gmx.io/' }))(
      //   $text('$50,000 GBC #GAMBIT ROI Trading Contest')
      // )
    )

  }

  return $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '20px', }))(
    $column(layoutSheet.spacing, style({ alignItems: 'center' }))(
      $details(from, to),
      $anchor(style({ fontSize: '.65em' }), attr({ href: 'https://medium.com/@BlueberryClub/gbc-roadmap-update-pt-1-316228c1ebe7#0d2d' }))(
        $text('medium.com - GBC Monthly Trading Competition')
      ),
    )
  )
}

export const $competitionPrize = (prize: bigint | undefined, realisedPnl: bigint) => {
  const val = formatReadableUSD(realisedPnl)
  const isNeg = realisedPnl < 0n

  return $row(
    $column(style({ alignItems: 'center' }))(
      prize ? style({ fontSize: '1.3em' })($ProfitLossText(prize)) : empty(),
      style({ color: pallete.message })(
        $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
          `${isNeg ? '' : '+'}${val}`
        )
      )
    )
  )
}

export const $avaxIcon = $element('img')(attr({ src: `/assets/avalanche.svg` }), style({ width: '24px', cursor: 'pointer', padding: '3px 6px' }))()
