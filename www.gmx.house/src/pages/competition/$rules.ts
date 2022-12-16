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


  const details = (start: number, end: number) => {
    const now = unixTimestampNow()
    const ended = end < now

    return start > now
      ? $column(style({ alignItems: 'center' }))(
        $text(`Starting in`),
        $text(style({ fontWeight: 'bold', fontSize: '3em' }))(countdown(start)),
      )
      : $column(
        $node(layoutSheet.spacing, style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', fontSize: '1.15em', alignItems: 'center', placeContent: 'center' }))(
          ended
            ? $text(style({ color: ended ? '' : pallete.indeterminate }))(
              `Competition has ended!`
            )
            : $text(style({ color: ended ? '' : pallete.indeterminate }))('Competition is LIVE!'),
          $row(layoutSheet.spacingSmall)(
            $AnchorLink({
              anchorOp: O(style({ position: 'relative' })),
              $content: $text('Top Profit'),
              url: `/avalanche/top-profit`,
              route: parentRoute.create({ fragment: 'top-profit' })
            })({ click: routeChangeTether() }),
            $row(style({ color: pallete.foreground }))($text('|')),
            $AnchorLink({
              anchorOp: style({ position: 'relative' }),
              $content: $text('Top ROI'),
              url: `/avalanche/top-roi`,
              route: parentRoute.create({ fragment: 'top-roi' })
            })({ click: routeChangeTether() }),
          )
        )
      )

  }

  return $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '20px', }))(
    $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
      $text(style({ fontSize: '3.2em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${pallete.primary}, 1px 1px 50px ${colorAlpha(pallete.primary, .55)} ` }))('#GMXRush'),
    ),
    $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      $anchor(style({ fontSize: '.65em' }), attr({ href: 'https://medium.com/@gmx.io/launching-this-friday-the-year-end-gmxrush-avalanche-trading-contest-with-a-150-000-prize-pool-639c30e8b9db' }))(
        $text('medium.com - $150,000 #GMXRUSH Avalanche Trading Contest #2')
      ),
      $node(),

      details(from, to),
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
