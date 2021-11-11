import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"

export interface IButton<T> {
  options: T[]
  selected: Stream<T | null>
  $option?: Op<T, $Node>
}

const $toggleBtn = $row(layoutSheet.flex, style({ placeContent: 'center', alignItems: 'center', cursor: 'pointer', backgroundColor: pallete.background }))
const $container = $row(layoutSheet.flex, style({ border: `1px solid ${pallete.middleground}`, backgroundColor: pallete.middleground, gap: '1px', overflow: 'hidden', borderRadius: '8px' }))


const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>({ options, selected, $option = defaultOption }: IButton<T>) => component((
  [select, sampleSelect]: Behavior<INode, T>
) => {

  const selectedState = merge(select, selected)

  return [
    $container(
      ...options.map(opt =>
        $toggleBtn(
          sampleSelect(
            nodeEvent('click'),
            constant(opt)
          ),
          styleBehavior(
            map(selectedOpt =>
              selectedOpt === opt
                ? { backgroundColor: '#1a425b', cursor: 'default' }
                : { color: pallete.foreground }
            , selectedState)
          )
        )(
          switchLatest(
            $option(now(opt))
          )
        )
      )
    ),

    { select }
  ]
})