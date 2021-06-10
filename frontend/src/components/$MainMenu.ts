import { $element, $text, attr, Behavior, component, IBranch, style, stylePseudo } from '@aelea/core'
import { $icon, $row, layoutSheet } from '@aelea/ui-components'
import { $Link } from '../components/$Link'
import { $github } from '../elements/$icons'
import { Route } from '@aelea/router'
import { pallete } from '@aelea/ui-components-theme'
import { O, Op } from '@aelea/utils'
import { now } from '@most/core'
import { $anchor } from '../elements/$common'




interface MainMenu {
  parentRoute: Route
  containerOp?: Op<IBranch, IBranch>
}

export const $MainMenu = ({ parentRoute, containerOp = O() }: MainMenu) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>
) => {

  const guideRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = parentRoute.create({ fragment: 'examples', title: 'Examples' })

  const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')
  
  return [
    $row(layoutSheet.spacingBig, style({ fontSize: '.9em' }), containerOp)(

      // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
      //   click: sampleLinkClick()
      // }),

      $Link({ $content: $text('Portfolio'), url: '/p/account', route: examplesRoute })({
        click: routeChangeTether()
      }),
      $Link({ $content: $text('Leaderboard'), url: '/p/leaderboard', route: guideRoute })({
        click: routeChangeTether()
      }),
      $Link({ $content: $text('API(WIP)'), disabled: now(true), url: '/p/examples/theme', route: examplesRoute })({
        click: routeChangeTether()
      }),
    ),


    { routeChange }
  ]
})


