import { component, styleBehavior, StyleCSS, $Branch, $element, style } from "@aelea/dom"
import { O } from "@aelea/core"
import { IAnchor, $RouterAnchor } from "@aelea/router"
import { empty, map } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"
import { Stream } from "@most/types"
import { combineArray } from "@aelea/utils"
import { Behavior } from "@aelea/core"


export interface ILink extends Omit<IAnchor, '$anchor'> {
  $content: $Branch<HTMLAnchorElement>
  disabled?: Stream<boolean>
}

const $anchor = $element('a')(
  style({
    color: pallete.message
  }),
)

export const $Link = ({ url, route, $content, anchorOp, disabled = empty() }: ILink) => component((
  [click, clickTether]: Behavior<string, string>,
  [active, containsTether]: Behavior<boolean, boolean>,
  [focus, focusTether]: Behavior<boolean, boolean>,
) => {
  const $anchorEl = $anchor(
    styleBehavior(
      combineArray((isActive, isFocus): StyleCSS | null => {
        return isActive ? { color: `${pallete.primary} !important`, fill: pallete.primary, cursor: 'default' }
          : isFocus ? { color: `${pallete.primary} !important`, fill: pallete.primary }
            : null
      }, active, focus)
    ),
    styleBehavior(map(isDisabled => (isDisabled ?  { pointerEvents: 'none', opacity: .3 } : {}), disabled))
  )($content)

  return [
    $RouterAnchor({ $anchor: $anchorEl, url, route, anchorOp: O(anchorOp || O(), style({ padding: 0 })) })({
      click: clickTether(),
      focus: focusTether(),
      contains: containsTether()
    }),

    { click, active, focus }
  ]
})