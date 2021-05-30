import { map, merge, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $Node, Behavior, component, INode, style, stylePseudo } from '@aelea/core'
import { pallete } from "@aelea/ui-components-theme"
import { $row, $VirtualScroll, layoutSheet, QuantumScroll, ScrollRequest } from "@aelea/ui-components"
import { O, Op } from "@aelea/utils"


export interface TablePageResponse<T> {
  data: T[]
  pageSize: number,
}

export interface TableOption<T> {
  columns: TableColumn<T>[]

  dataSource: Stream<TablePageResponse<T>>
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  bodyContainerOp?: Op<INode, INode>

  cellOp?: Op<INode, INode>
  headerCellOp?: Op<INode, INode>
  bodyCellOp?: Op<INode, INode>
}

export interface TableColumn<T> {
  $head: $Node
  valueOp: Op<T, $Node>

  columnOp?: Op<INode, INode>
}



const $rowContainer = $row(layoutSheet.spacing)
const $rowHeaderContainer = $rowContainer(style({ overflowY: 'scroll' }), stylePseudo('::-webkit-scrollbar', { backgroundColor: 'transparent', width: '6px' }))


export const $TableZZ = <T>({ dataSource, columns, scrollConfig, cellOp, headerCellOp, bodyCellOp, bodyContainerOp }: TableOption<T>) => component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>
) => {


  const cellStyle = O(
    style({ padding: '3px 6px', overflowWrap: 'break-word', alignItems: 'center' }),
    layoutSheet.flex,
  )

  const $CellHeader = $row(
    cellStyle,
    style({ fontSize: '15px', color: pallete.foreground, }),
    cellOp || O(),
    headerCellOp || O()
  )

  const $CellBody = $row(
    cellStyle,
    cellOp || O(),
    bodyCellOp || O()
  )

  const $header = $rowHeaderContainer(
    ...columns.map(col => {
      return $CellHeader(col.columnOp || O())(
        col.$head
      )
    })
  )


  const $body = $VirtualScroll({
    ...scrollConfig,
    containerOps: bodyContainerOp,
    dataSource: map(({ data, pageSize }) => {
      const $items = data.map(rowData =>
        $rowContainer(
          ...columns.map(col =>
            $CellBody(col.columnOp || O())(
              switchLatest(col.valueOp(now(rowData)))
            )
          )
        )
      )
      return { $items, pageSize }
    }, dataSource)
  })({
    scrollRequest: requestListTether()
  })

  return [
    merge(
      $body,
      $header,
    ),

    { requestList }
  ]

})
