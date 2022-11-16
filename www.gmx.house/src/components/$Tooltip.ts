import { Behavior } from "@aelea/core"
import { $Node, component, eventElementTarget, INode, NodeComposeFn, nodeEvent, style, styleInline } from '@aelea/dom'
import { $row, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, switchLatest, empty, map, skipRepeats, startWith } from "@most/core"




export interface TooltipConfig {
  $anchor: $Node
  $content: $Node
  $container?: NodeComposeFn<$Node>,
}




export const $Tooltip = ({ $anchor, $content, $container = $row }: TooltipConfig) => component((
  [hover, hoverTether]: Behavior<INode, boolean>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {



  return [
    $container(
      hoverTether(
        nodeEvent('pointerenter'),
        map(enterEvent => {

          const target = enterEvent.currentTarget
          if (!(target instanceof HTMLElement)) {
            throw new Error('invalid Target element')
          }

          const pointerLeave = eventElementTarget('pointerleave', target)
          return startWith(true, constant(false, pointerLeave))
          // return startWith(true, never())
        }),
        switchLatest,
        skipRepeats,
      ),
      targetIntersectionTether(
        observer.intersection(),
      )
    )(
      $anchor,
      switchLatest(map(show => {
        if (!show) {
          return empty()
        }

        return $row(
          style({
            zIndex: 5160,
            position: 'absolute',
            display: 'none',
            background: pallete.background,
            border: pallete.middleground,
            boxShadow: '1px 1px 5px #0000007a',
            padding: '8px',
            maxWidth: '250px',
            borderRadius: '8px',
            // fontSize: '.75em',
          }),
          styleInline(
            map(([rect]) => {
              const { bottom, top, left, right, width } = rect.intersectionRect

              const bottomSpcace = window.innerHeight - bottom
              const goDown = bottomSpcace > bottom
              const leftOffset = width / 2

              return {
                top: (goDown ? bottom + 5 : top - 5) + 'px',
                left: right - leftOffset + 'px',
                display: 'flex',
                transform: `translate(-50%, ${goDown ? 0 : -100}%)`,
              }
            }, targetIntersection)
          ),
        )(
          $content
        )
      }, hover))
    ),
    {
      hover
    }
  ]

})
