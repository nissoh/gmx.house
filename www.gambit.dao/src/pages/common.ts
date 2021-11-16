import { isStream, O, Op } from "@aelea/core"
import { $text, component, INode, style, styleBehavior } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { filter, map, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import { ARBITRUM_TRADEABLE_ADDRESS, calculatePositionDelta, formatReadableUSD, getLiquidationPriceFromDelta, IAggregatedAccountSummary, IAggregatedOpenPositionSummary, IAggregatedSettledTradeSummary, IAggregatedTradeSummary, liquidationWeight, parseFixed } from "gambit-middleware"
import { klineWS, PRICE_EVENT_TICKER_MAP, WSBTCPriceEvent } from "../binance-api"
import { $tokenIconMap } from "../common/$icons"
import { TableColumn } from "../common/$Table2"
import { $leverage, $liquidationSeparator } from "../elements/$common"
import { $bear, $bull, $skull } from "../elements/$icons"


export const filterByIndexToken = (pos: ARBITRUM_TRADEABLE_ADDRESS) => filter((data: WSBTCPriceEvent) => {
  const token = PRICE_EVENT_TICKER_MAP[pos]
  
  return token === data.s
})




const intervals = [
  { label: 'year', seconds: 31536000 },
  { label: 'month', seconds: 2592000 },
  { label: 'day', seconds: 86400 },
  { label: 'hour', seconds: 3600 },
  { label: 'minute', seconds: 60 },
  { label: 'second', seconds: 1 }
] as const

export function timeSince(time: number) {
  const seconds = Date.now() / 1000 - time | 0
  const interval = intervals.find(i => i.seconds < seconds)

  if (!interval)
    return ''
  const count = seconds / interval.seconds | 0
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
}

export const priceChange = multicast(klineWS('ethusdt@aggTrade', 'btcusdt@aggTrade', 'linkusdt@aggTrade', 'uniusdt@aggTrade'))


 

export const tableRiskColumnCellBody: TableColumn<IAggregatedAccountSummary> = {
  $head: $text('Risk'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
  $body: map((pos: IAggregatedTradeSummary) => {

    return $leverage(pos)
  })
}

export const tableSizeColumnCellBody: TableColumn<IAggregatedAccountSummary> = {
  $head: $text('Risk'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.3, textAlign: 'left', minWidth: '80px', placeContent: 'flex-start' })),
  $body: map((pos: IAggregatedTradeSummary) => {

    return $row(style({ alignItems: 'center', fontSize: '.65em' }), layoutSheet.spacingTiny)(
      $text(formatReadableUSD(pos.size))
    )
  })
}

export const $ProfitLossText = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = multicast(map(n => {
    return n > 0n ? '+' + formatReadableUSD(n) : formatReadableUSD(n)
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

export const $SummaryProfitLoss = (pos: IAggregatedSettledTradeSummary) => $ProfitLossText(pos.pnl - pos.fee)


export const $Risk = (pos: IAggregatedTradeSummary, containerOp: Op<INode, INode> = O()) => component(() => {
  return [
    $column(layoutSheet.spacingTiny, style({ textAlign: 'center' }), containerOp)(
      $text(formatReadableUSD(pos.size)),
      $seperator,
      style({ textAlign: 'center', fontSize: '.65em' }, $leverage(pos)),
    )
  ]
})

export const $RiskLiquidator = (pos: IAggregatedOpenPositionSummary, markPrice: Stream<bigint>) => component(() => {
  const liquidationPrice = getLiquidationPriceFromDelta(pos.collateral, pos.size, pos.averagePrice, pos.isLong)


  const liqPercentage = map(price => {
    const weight = liquidationWeight(pos.isLong, liquidationPrice, price)
    return weight
  }, markPrice)

  return [
    $column(layoutSheet.spacingTiny, style({ minWidth: '100px', alignItems: 'center' }))(
      $text(formatReadableUSD(pos.size)),
      $liquidationSeparator(liqPercentage),
      $row(style({ fontSize: '.65em', gap: '2px', alignItems: 'center' }))(
        $leverage(pos),

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


export const $LivePnl = (pos: IAggregatedOpenPositionSummary) => component(() => {
  const pnlPosition = multicast(map(price => {
    const markPrice = parseFixed(price.p, 30)

    return calculatePositionDelta(markPrice, pos.isLong, pos, )
  }, filterByIndexToken(pos.indexToken)(priceChange)))

  return [
    $row(
      $ProfitLossText(
        map(meta => meta.delta - pos.fee, pnlPosition)
      )
    )
  ]
})

export const $TokenIndex = (pos: IAggregatedOpenPositionSummary, IIcon?: { width?: string }) => {
  const $token = $tokenIconMap[pos.indexToken]

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

export const $Entry = (pos: IAggregatedOpenPositionSummary) =>
  $row(
    $column(layoutSheet.spacingTiny, style({ alignSelf: 'flex-start' }))(
      $row(style({ position: 'relative', flexDirection: 'row-reverse', alignSelf: 'center' }))(
        $TokenIndex(pos),
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



