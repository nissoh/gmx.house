import { Behavior, O, Op } from "@aelea/core"
import { $Node, component, eventElementTarget, IBranch, INode, NodeComposeFn, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $row, Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, mergeArray, multicast, now, skip, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"


export const buttonPrimaryStyle = style({
  color: 'white', whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
  padding: '12px 24px', fontWeight: 'bold', borderWidth: '1px', borderColor: pallete.message
})

export const secondaryButtonStyle = style({
  backgroundImage: 'linear-gradient(45deg,  #8A5FCF 21%, #D298ED 100%)',
  boxShadow: `2px 1000px 1px ${pallete.background} inset`,
  backgroundOrigin: 'border-box',
  backgroundClip: 'content-box, border-box',
  border: '1px solid transparent',
  borderRadius: '50px'
})

export interface ISelect<T> {
  options: T[]

  $container?: NodeComposeFn<$Node>
  $option?: NodeComposeFn<$Node>

  optionOp: Op<T, $Node>
  $changeSelect?: Stream<T>
}





export const $Select = <T>({ options, optionOp, $option = $column, $container = $column }: ISelect<T>) => component((
  [select, selectTether]: Behavior<IBranch, T>
) => {

  return [
    $container(
      ...options.map(item => {

        const selectBehavior = selectTether(
          nodeEvent('click'),
          constant(item)
        )

        const $opt = switchLatest(optionOp(now(item)))
        const $val = $option($opt)

        return selectBehavior($val)
      })
    ),

    {
      select
    }
  ]
})



export interface IDropdown<T> extends Input<T> {
  select: Omit<ISelect<T>, '$value'>
  $selection: Op<T, $Node>
  $container?: NodeComposeFn<$Node>
  $option?: NodeComposeFn<$Node>

  openMenuOp?: Op<MouseEvent, MouseEvent>
}



export const $defaultOptionContainer = $row(layoutSheet.spacingSmall, style({ alignItems: 'center', padding: '15px 25px', width: '100%' }), style({ cursor: 'pointer' }), stylePseudo(':hover', { backgroundColor: pallete.middleground }))
export const $defaultDropdownContainer = $column(layoutSheet.spacingTiny)
export const $defaultSelectContainer = $column(layoutSheet.spacingTiny, style({
  minWidth: '200px', alignItems: 'center', placeContent: 'center',
  border: `1px solid ${pallete.middleground}`, borderRadius: '20px',
  backgroundColor: pallete.background,
  boxShadow: `rgb(0 0 0 / 21%) 1px 1px 14px`
}))


export const $Dropdown = <T>({
  value, disabled, validation,
  $container = $defaultDropdownContainer,
  $selection,
  $option = $defaultOptionContainer,
  select, openMenuOp = O() }: IDropdown<T>) => component((
  [pick, pickTether]: Behavior<T, T>,
  [openMenu, openMenuTether]: Behavior<INode, any>,
) => {

  const isOpenState = multicast(switchLatest(map(isOpen => {
    if (isOpen) {
      return startWith(true, skip(1, constant(false, eventElementTarget('click', window))))
    }
    return now(false)
  }, mergeArray([constant(false, pick), openMenu]))))

  const openMenuBehavior = openMenuTether(
    nodeEvent('click'),
    openMenuOp
  )
  
  return [
    $container(style({ position: 'relative' }))(
      openMenuBehavior(switchLatest(
        $selection(merge(pick, value))
      )),

      $Select({
        ...select,
        $container: (select.$container || $defaultSelectContainer)(
          style({
            overflow: 'hidden', zIndex: 50,
            position: 'absolute', top: 'calc(100% + 5px)', display: 'none'
          }),
          styleBehavior(
            map(state => {
              return { display: state ? 'flex!important' : 'none!important' }
            }, isOpenState)
          )
        ),
        $option
        // $option: map(x => $selectableOption($text(String(x))))
      })({ select: pickTether() })
    ),

    {
      select: pick
    }
  ]
})

