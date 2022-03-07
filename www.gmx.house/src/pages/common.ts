import { isStream, O, Op } from "@aelea/core"
import { $node, $text, component, INode, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import { calculatePositionDelta, formatFixed, formatReadableUSD, getLiquidationPriceFromDelta, ITrade, IPositionDelta, liquidationWeight, parseFixed, ITradeOpen, IAbstractTrade, intervalInMsMap, IPriceTimeline, IPriceLatestMap, AVALANCHE_TRADEABLE_ADDRESS, TOKEN_ADDRESS_TO_SYMBOL, TOKEN_SYMBOL } from "@gambitdao/gmx-middleware"
import { $tokenIconMap } from "../common/$icons"
import { TableColumn } from "../common/$Table2"
import { $leverage, $liquidationSeparator } from "../elements/$common"
import { $bear, $bull, $skull } from "../elements/$icons"





const intervals = [
  { label: 'year', seconds: intervalInMsMap.MONTH * 12 },
  { label: 'month', seconds: intervalInMsMap.MONTH },
  { label: 'day', seconds: intervalInMsMap.HR24 },
  { label: 'hour', seconds: intervalInMsMap.MIN * 60 },
  { label: 'minute', seconds: intervalInMsMap.MIN },
  { label: 'second', seconds: intervalInMsMap.SEC }
] as const

export function timeSince(time: number) {
  const timeDelta = (Date.now() / 1000) - time
  const interval = intervals.find(i => i.seconds < timeDelta)

  if (!interval) {
    return ''
  }
    
  const count = Math.floor(timeDelta / interval.seconds)
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
}

export function getPricefeedVisibleColumns(maxColumns: number, from: number, to: number) {
  const delta = to - from

  const interval = maxColumns < delta / intervalInMsMap.DAY7
    ? intervalInMsMap.DAY7 : maxColumns < delta / intervalInMsMap.HR24
      ? intervalInMsMap.HR24 : maxColumns < delta / intervalInMsMap.HR4
        ? intervalInMsMap.HR4 : maxColumns < delta / intervalInMsMap.MIN60
          ? intervalInMsMap.MIN60 : intervalInMsMap.MIN15
  
  return interval
}
 

export const tableRiskColumnCellBody: TableColumn<ITrade> = {
  $head: $text('Risk'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
  $body: map((pos: ITrade) => {

    return $leverage(pos)
  })
}

export const tableSizeColumnCellBody: TableColumn<ITrade> = {
  $head: $text('Risk'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
  $body: map((pos: ITrade) => {

    return $row(style({ alignItems: 'center', fontSize: '.65em' }), layoutSheet.spacingTiny)(
      $text(formatReadableUSD(pos.size))
    )
  })
}

export const $ProfitLossText = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = multicast(map(n => {
    return (n > 0n ? '+' : '') + formatReadableUSD(n)
  }, pnls))

  const colorStyle = colorful
    ? styleBehavior(map(str => {
      const isNegative = str.indexOf('-') > -1
      return { color: isNegative ? pallete.negative : pallete.positive }
    }, display))
    : O()
  
  // @ts-ignore
  return $text(colorStyle)(display)
}

export const $SummaryDeltaPercentage = (delta: IPositionDelta) => {

  const perc = formatFixed(delta.deltaPercentage, 2)
  const isNeg = delta.deltaPercentage < 0n

  return $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
    `${isNeg ? '' : '+'}${perc}%`
  )
}


export const $Risk = (pos: IAbstractTrade, containerOp: Op<INode, INode> = O()) => component(() => {
  return [
    $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }), containerOp)(
      $text(formatReadableUSD(pos.size)),
      $seperator,
      style({ textAlign: 'center', fontSize: '.65em' }, $leverage(pos)),
    )
  ]
})

export const $RiskLiquidator = (pos: ITradeOpen, markPrice: Stream<bigint>) => component(() => {
  const liquidationPrice = getLiquidationPriceFromDelta(pos.collateral, pos.size, pos.averagePrice, pos.isLong)
  const liqPercentage = map(price => liquidationWeight(pos.isLong, liquidationPrice, price), markPrice)

  return [
    $column(layoutSheet.spacingTiny, style({ minWidth: '100px', alignItems: 'center' }))(
      $text(formatReadableUSD(pos.size)),
      $liquidationSeparator(liqPercentage),
      $row(style({ fontSize: '.65em', gap: '2px', alignItems: 'center' }))(
        $leverage(pos),

        $node(),

        $icon({
          $content: $skull,
          width: '12px',
          svgOps: style({ marginLeft: '3px' }),
          viewBox: '0 0 32 32',
        }),
        $text(style({  }))(
          formatReadableUSD(liquidationPrice)
        )
      )
    )
  ]
})


export const $livePnl = (trade: ITrade, pos: Stream<bigint>) => $row(
  $ProfitLossText(
    map(price => {
      const delta = calculatePositionDelta(price, trade.averagePrice, trade.isLong, trade)

      return delta.delta - trade.fee
    }, pos)
  )
)

export const $TokenIndex = (indexToken: TOKEN_SYMBOL, IIcon?: { width?: string }) => {
  const $token = $tokenIconMap[indexToken]

  if (!$token) {
    throw new Error('Unable to find matched token')
  }

  return $icon({
    $content: $token,
    viewBox: '0 0 32 32',
    width: '24px',
    ...IIcon
  })
}

export const $Entry = (pos: ITrade) =>
  $row(
    $column(layoutSheet.spacingTiny, style({ alignSelf: 'flex-start' }))(
      $row(style({ position: 'relative', flexDirection: 'row-reverse', alignSelf: 'center' }))(
        $TokenIndex(TOKEN_ADDRESS_TO_SYMBOL[pos.indexToken]),
        style({ borderRadius: '50%', padding: '3px', marginRight: '-5px', backgroundColor: pallete.background, })(
          $icon({
            $content: pos.isLong ? $bull : $bear,
            viewBox: '0 0 32 32',
          })
        ),
      ),  
      $text(style({ fontSize: '.65em', textAlign: 'center', color: pallete.primary }))(formatReadableUSD(pos.averagePrice))
    )
  )



