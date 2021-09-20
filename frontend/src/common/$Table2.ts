import { chain, constant, map, merge, never, now, scan, startWith, switchLatest, until } from "@most/core"
import { Stream } from "@most/types"
import { $Node, $svg, attr, component, INode, nodeEvent, style, stylePseudo } from '@aelea/dom'
import { pallete } from "@aelea/ui-components-theme"
import { $VirtualScroll, IScrollPagableReponse, QuantumScroll, ScrollRequest, ScrollResponse } from "./$VirtualScroll2"
import { Behavior, O, Op } from "@aelea/core"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"



export type TablePageResponse<T> = T[] | Omit<IScrollPagableReponse, '$items'> & { data: T[] }

export interface TableOption<T> {
  columns: TableColumn<T>[]

  dataSource: Stream<TablePageResponse<T>>
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  bodyContainerOp?: Op<INode, INode>

  cellOp?: Op<INode, INode>
  headerCellOp?: Op<INode, INode>
  bodyCellOp?: Op<INode, INode>

  sortChange?: Stream<ISortBy<T>>
  $sortArrowDown?: $Node
}

export interface TableColumn<T> {
  $head: $Node
  $body: Op<T, $Node>
  sortBy?: keyof T,


  columnOp?: Op<INode, INode>
}

export interface IPageRequest {
  page: ScrollRequest,
  pageSize: number
}

export interface ISortBy<T> {
  direction: 'asc' | 'desc'
  name: keyof T
}


export const $caretDown = $svg('path')(attr({ d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z' }))()


export const $Table2 = <T>({
  dataSource, columns, scrollConfig, cellOp,
  headerCellOp, bodyCellOp, bodyContainerOp,
  sortChange = never(),
  $sortArrowDown = $caretDown
}: TableOption<T>) => component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>,
  [sortBy, sortByTether]: Behavior<INode, keyof T>
) => {


  const cellStyle = O(
    style({ padding: '3px 6px', overflowWrap: 'break-word', alignItems: 'center' }),
    layoutSheet.flex,
  )

  const $cellHeader = $row(
    cellStyle,
    layoutSheet.spacingSmall,
    style({ fontSize: '15px', color: pallete.foreground, }),
    cellOp || O(),
    headerCellOp || O()
  )

  const cellBodyOp = O(
    cellStyle,
    cellOp || O(),
    bodyCellOp || O()
  )

  const $rowContainer = $row(layoutSheet.spacing)

  const $rowHeaderContainer = $rowContainer(style({ overflowY: 'scroll' }), stylePseudo('::-webkit-scrollbar', { backgroundColor: 'transparent', width: '6px' }))

  const sortState = chain((state) => {
    const changeState = scan((seed, change): ISortBy<T> => {
      const direction = seed.name === change ?
        seed.direction === 'asc' ? 'desc' : 'asc'
        : 'desc'
      
      return { direction, name: change }
    }, state, sortBy)

    return startWith(state, changeState)
  }, sortChange)

  const $header = $rowHeaderContainer(
    ...columns.map(col => {

      if (col.sortBy) {
        const behavior = sortByTether(
          nodeEvent('click'),
          constant(col.sortBy)
        )

        return $cellHeader(behavior, col.columnOp || O())(
          style({ cursor: 'pointer' }, col.$head),
          switchLatest(map(s => {

            return $column(style({ cursor: 'pointer' }))(
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'asc' ? pallete.foreground : '' : pallete.foreground, svgOps: style({ transform: 'rotate(180deg)' }), width: '6px', viewBox: '0 0 32 19.43' }),
              $icon({ $content: $sortArrowDown, fill: s.name === col.sortBy ? s.direction === 'desc' ? pallete.foreground : '' : pallete.foreground, width: '6px', viewBox: '0 0 32 19.43' })
            )
          }, sortState))
        )
      }
            
      const $headCell = $cellHeader(col.columnOp || O())(
        col.$head
      )

      return $headCell
    })
  )


  const $body = $VirtualScroll({
    ...scrollConfig,
    containerOps: bodyContainerOp,
    dataSource: map((res): ScrollResponse => {
      const $items = (Array.isArray(res) ? res : res.data).map(rowData => 
        $rowContainer(
          ...columns.map(col => O(cellBodyOp, col.columnOp || O())(
            switchLatest(col.$body(now(rowData)))
          )
          )
        )
      )

      if (Array.isArray(res)) {
        return $items
      } else {
        return {
          $items,
          offset: res.offset,
          pageSize: res.pageSize
        }
      }


      return $items
    }, dataSource)
  })({
    scrollRequest: requestListTether()
  })

  return [
    merge(
      $body,
      $header,
    ),

    {
      requestList,
      sortBy: sortState
    }
  ]

})
