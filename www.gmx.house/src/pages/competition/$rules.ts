import { Op } from "@aelea/core"
import { $text, style, attr, $node } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, periodic } from "@most/core"
import { formatReadableUSD, unixTimestampNow } from "@gambitdao/gmx-middleware"
import { $AnchorLink } from "../../components/$Link"
import { $anchor } from "../../elements/$common"
import { $ProfitLossText } from "../common"


export const COMPETITION_START = Date.UTC(2022, 10, 16) / 1000
export const COMPETITION_END = Date.UTC(2022, 10, 23) / 1000

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

export function $CompeititonInfo(parentRoute: Route, routeChangeTether: () => Op<string, string>) {


  const details = (start: number, end: number) => {
    const now = unixTimestampNow()
    const ended = end < now

    return $row(layoutSheet.spacingSmall, style({ fontSize: '.85em', alignItems: 'center', placeContent: 'center' }))(
      ...start > now
        ? [
          $column(style({ alignItems: 'center' }))(
            $text(`Starting in`),
            $text(style({ fontWeight: 'bold', fontSize: '3em' }))(countdown(start)),
          )
        ]
        : [
          $text(style({ color: ended ? '' : pallete.indeterminate }))(
            `Competition ${ended ? 'has ended!' : 'is Live!'} `),
          $AnchorLink({
            anchorOp: style({ position: 'relative' }),
            $content: $text('Top Profit'),
            url: `/arbitrum/top-profit`,
            route: parentRoute.create({ fragment: '2121212' })
          })({ click: routeChangeTether() }),
          $row(style({ color: pallete.foreground }))($text('|')),
          $AnchorLink({
            anchorOp: style({ position: 'relative' }),
            $content: $text('Top ROI'),
            url: `/arbitrum/top-roi`,
            route: parentRoute.create({ fragment: '2121212' })
          })({ click: routeChangeTether() }),

        ]
    )
  }

  return $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '60px', }))(
    $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
      $text(style({ fontSize: '3.8em', fontWeight: 'bold', color: pallete.primary, textShadow: `1px 1px 50px ${pallete.primary}, 1px 1px 50px ${colorAlpha(pallete.primary, .55)} ` }))('#GMXRush'),
      $text(style({}))('Tournament'),
    ),
    $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      $anchor(style({ fontSize: '.65em' }), attr({ href: 'https://medium.com/@gmx.io/sign-up-for-the-gmxrush-avalanche-trading-contest-win-100-000-usd-in-prizes-546b1ab2e416' }))(
        $text('medium.com - #GMXRUSH Avalanche Trading Contest')
      ),
      $node(),

      details(COMPETITION_START, COMPETITION_END),
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