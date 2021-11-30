import { Op } from "@aelea/core"
import { $text, style, attr, $node } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, periodic } from "@most/core"
import { IPositionDelta } from "@gambitdao/gmx-middleware"
import { $AnchorLink } from "../../components/$Link"
import { $anchor } from "../../elements/$common"
import { $ProfitLossText, $SummaryDeltaPercentage } from "../common"


export const COMPETITION_START = Date.UTC(2021, 10, 3, 13, 0, 0)
export const COMPETITION_END = Date.UTC(2021, 10, 30, 13, 0, 0)

export const BATCH_1_END = Date.UTC(2021, 10, 16, 13, 0, 0)
export const BATCH_2_START = Date.UTC(2021, 10, 17, 13, 0, 0)

const secondsCountdown = map(Date.now, periodic(1000))

const competitionCountdown = (startDate: number) => map(now => {
  const distance = startDate - now

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      
  return `${days ? days + "d " : ''} ${hours ? hours + "h " : '' } ${ minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
}, secondsCountdown)


export function $CompeititonInfo(parentRoute: Route, routeChangeTether: () => Op<string, string>) {


  const details = (start: number, end: number, isFirst: boolean) => {
    const now = Date.now()
    const ended = end < now

    return $row(layoutSheet.spacingSmall, style({ fontSize: '.85em', alignItems: 'center', placeContent: 'center' }))(
      ...start > now
        ? [
          $text(`Batch ${isFirst ? 'I' : 'II'} is starting in! `),
          $text(style({ fontWeight: 'bold' }))(competitionCountdown(start)),
        ]
        : [
          $text(style({ color: ended ? '' : pallete.indeterminate }))(
            `Batch ${isFirst ? 'I' : 'II'} ${ended ?  'has ended!' : 'is Live!'} `),
          $AnchorLink({
            anchorOp: style({ position: 'relative' }),
            $content: $text('Top Single %'),
            url: `/p/redvsgreen-nov2021-single-` + (isFirst ? '1' : '2'),
            route: parentRoute.create({ fragment: '2121212' })
          })({ click: routeChangeTether() }),
          $row(style({ color: pallete.foreground }))($text('|')),
          $AnchorLink({
            anchorOp: style({ position: 'relative' }),
            $content: $text('Top Cumulative %'),
            url: `/p/redvsgreen-nov2021-cumulative-` + (isFirst ? '1' : '2'),
            route: parentRoute.create({ fragment: '2121212' })
          })({ click: routeChangeTether() }),
        ]
    )
  }
  
  return $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '60px', }))(
    $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
      $text(style({ fontSize: '2.8em', fontWeight: 'bold', color: pallete.negative, textShadow: `1px 1px 50px ${pallete.negative}, 1px 1px 50px rgb(250 67 51 / 59%) ` }))('RED'),
      $text(style({}))('vs.'),
      $text(style({ fontSize: '2.8em', fontWeight: 'bold', color: pallete.positive, textShadow: `1px 1px 50px ${pallete.positive}` }))('GREEN')
    ),
    $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      $anchor(style({ fontSize: '.65em' }), attr({ href: 'https://medium.com/@gmx.io/gmx-trading-competition-win-250-000-usd-in-prizes-1346504b96f6' }))(
        $text('medium.com - GMX Trading Competition — Win $250,000 USD in Prizes')
      ),
      $node(),

      details(COMPETITION_START, BATCH_1_END, true),
      details(BATCH_2_START, COMPETITION_END, false),
    )
  )
}

export  const $competitionPrize = (prize: bigint | undefined, delta: IPositionDelta) => {
  return $row(
    $column(style({ alignItems: 'center' }))(
      prize ? style({ fontSize: '1.2em' })($ProfitLossText(prize)) : empty(),
      style({ color: pallete.message, fontSize: '.65em' })(
        $SummaryDeltaPercentage(delta)
      )
    )
  )
}