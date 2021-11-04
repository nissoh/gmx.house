import { Op } from "@aelea/core"
import { $text, style, attr } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $row, layoutSheet, $column } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, periodic, skipRepeats, switchLatest } from "@most/core"
import { $AnchorLink } from "../../components/$Link"
import { $anchor } from "../../elements/$common"



enum CompetitionDisplay {
  CONUTER,
  COMPETITION_DETAILS,
  COMPETITION_RESULTS,
}


// Set the date we're counting down to
const competitionStartDate = Date.UTC(2021, 10, 3, 13, 0, 0)
const competitionEndDate = Date.UTC(2021, 10, 30, 13, 0, 0)

const secondsCountdown = map(Date.now, periodic(1000))

const competitionCountdown = map(now => {
  const distance = competitionStartDate - now

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      
  return `${days ? days + "d " : ''} ${hours ? hours + "h " : '' } ${ minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
}, secondsCountdown)

const $competitionTimer = $text(style({ fontWeight: 'bold' }))(competitionCountdown)

// const competitionEntryDetails = '

 
const competitionTypeChange = skipRepeats(map(now => {
  if (competitionStartDate > now) {
    return CompetitionDisplay.CONUTER
  }

  return now > competitionEndDate ? CompetitionDisplay.COMPETITION_RESULTS : CompetitionDisplay.COMPETITION_DETAILS
}, secondsCountdown))

export function $CompeititonInfo(parentRoute: Route, routeChangeTether: () => Op<string, string>) {

  const stateMap = {
    [CompetitionDisplay.CONUTER]: $row(layoutSheet.spacingSmall)(
      $text(style({}))(`Starting in ${new Date(competitionStartDate).toLocaleString()}... `),
      $competitionTimer
    ),
    [CompetitionDisplay.COMPETITION_DETAILS]: $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      $anchor(style({ fontSize: '.65em' }), attr({ href: 'https://medium.com/@gmx.io/gmx-trading-competition-win-250-000-usd-in-prizes-1346504b96f6' }))(
        $text('medium.com - GMX Trading Competition — Win $250,000 USD in Prizes')
      ),
      $row(layoutSheet.spacingSmall, style({ fontSize: '.85em', alignItems: 'center', placeContent: 'center' }))(
        $text(style({ color: pallete.indeterminate }))('Competiton is Live! '),
        $AnchorLink({
          anchorOp: style({ position: 'relative' }),
          $content: $text('Top Single %'),
          url: `/p/redvsgreen-nov2021-single-1`,
          route: parentRoute.create({ fragment: '2121212' })
        })({ click: routeChangeTether() }),
        $row(style({ color: pallete.foreground }))($text('|')),
        $AnchorLink({
          anchorOp: style({ position: 'relative' }),
          $content: $text('Top Cumulative %'),
          url: `/p/redvsgreen-nov2021-cumulative-1`,
          route: parentRoute.create({ fragment: '2121212' })
        })({ click: routeChangeTether() }),
      ),

    ),
    [CompetitionDisplay.COMPETITION_RESULTS]: $text('RESULTS'),
  }

  const $details = switchLatest(map(state => stateMap[state], competitionTypeChange))

  return $column(layoutSheet.spacing, style({ alignItems: 'center', placeContent: 'center', marginBottom: '60px', }))(
    $row(layoutSheet.spacingSmall, style({ alignItems: 'baseline' }))(
      $text(style({ fontSize: '2.8em', fontWeight: 'bold', color: pallete.negative, textShadow: `1px 1px 50px ${pallete.negative}, 1px 1px 50px rgb(250 67 51 / 59%) ` }))('RED'),
      $text(style({}))('vs.'),
      $text(style({ fontSize: '2.8em', fontWeight: 'bold', color: pallete.positive, textShadow: `1px 1px 50px ${pallete.positive}` }))('GREEN')
    ),
    $details
  )
}