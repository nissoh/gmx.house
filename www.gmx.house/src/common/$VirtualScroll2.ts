
import { Behavior, O, Op } from '@aelea/core'
import { $Branch, $custom, $Node, $text, component, IBranch, style } from '@aelea/dom'
import { $column, designSheet, observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { chain, delay, empty, filter, loop, map, merge, mergeArray, multicast, scan, skip, startWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'


export type ScrollRequest = number

export type IScrollPagableReponse = {
  $items: $Branch[]
  pageSize: number
  offset: number
}

export type ScrollResponse = $Branch[] | IScrollPagableReponse

export interface QuantumScroll {
  dataSource: Stream<ScrollResponse>

  $loader?: $Node

  containerOps?: Op<IBranch, IBranch>
}


const $defaultLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')


export const $VirtualScroll = ({ dataSource, containerOps = O(), $loader = $defaultLoader }: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const multicastDatasource = multicast(dataSource)

  const scrollReuqestWithInitial: Stream<ScrollRequest> = skip(1, scan(seed => seed + 1, -1, intersecting))

  const $container = $column(
    designSheet.customScroll,
    style({ overflow: 'auto' }),
    map(node => ({ ...node, insertAscending: false })),
    containerOps
  )
  
  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $observer = $custom('observer')(intersectedLoader)()

  const delayDatasource = delay(45, multicastDatasource)
  const loadState = merge(
    map(data => ({ $intermediate: $observer, data }), delayDatasource),
    map(() => ({ $intermediate: $loader, }), scrollReuqestWithInitial)
  )
  
  const $itemLoader = loop((seed, state) => {

    if ('data' in state && state.data) {
      
      if (Array.isArray(state.data)) {
        return { seed, value: empty() }
      }

      const hasMoreItems = state.data.pageSize === state.data.$items.length
      const value = hasMoreItems ? state.$intermediate : empty()

      return { seed, value }
    }

    return { seed, value: state.$intermediate }
  }, {  }, loadState)

  return [
    $container(
      chain($list => {
        const $items = Array.isArray($list) ? $list : $list.$items
        return mergeArray($items)
      }, multicastDatasource),
      switchLatest(
        startWith($observer, $itemLoader)
      )
    ),

    { scrollIndex: scrollReuqestWithInitial }
  ]
})